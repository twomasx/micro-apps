import { paymentsClosed, type PaymentsSettings } from '../settings';
import { PriceMismatchError, type PaymentsProvider, type Product } from '../types';
import { error, json } from './http';
import type { PurchaseRow, PurchaseStatus, PurchaseStore } from './store';

/** What every payments route needs. The provider is made only when a route talks to Stripe. */
export interface PaymentsContext {
  store: PurchaseStore;
  settings: PaymentsSettings;
  provider: () => PaymentsProvider;
}

/**
 * Starts a Stripe Checkout and records a pending purchase.
 * `extra` holds app-specific columns, like personality's result ids.
 */
export async function startCheckout(
  ctx: PaymentsContext,
  product: Product,
  urls: { successUrl: string; cancelUrl: string },
  extra: Record<string, string | number | null> = {},
): Promise<Response> {
  // The kill switch. Existing unlocks keep working; only new checkouts stop.
  if (!ctx.settings.enabled) {
    await ctx.store.log({ action: 'checkout', product: product.id, result: 'closed' });
    return paymentsClosed();
  }
  let session;
  try {
    session = await ctx.provider().createCheckout({ productId: product.id, ...urls });
  } catch (cause) {
    const priceMismatch = cause instanceof PriceMismatchError;
    await ctx.store.log({
      action: 'checkout',
      product: product.id,
      result: priceMismatch ? 'price_mismatch' : 'failed',
      detail: String(cause),
    });
    return error(502, 'checkout_failed', 'The checkout could not be started. Try again in a minute.');
  }
  await ctx.store.insertPending(session.sessionId, product, extra);
  await ctx.store.log({ action: 'checkout', product: product.id, sessionId: session.sessionId, result: 'started' });
  return json({ url: session.url }, 201);
}

/**
 * Asks Stripe about a pending purchase of ours and records it if it is paid. Returns the status after,
 * or null for a session this app (in this mode) never created. Used when the buyer comes back before the webhook.
 * `belongs` lets an app refuse a session that paid for something else.
 */
export async function confirmPurchase(
  ctx: PaymentsContext,
  sessionId: string,
  belongs: (row: PurchaseRow) => boolean = () => true,
): Promise<PurchaseStatus | null> {
  const row = await ctx.store.find(sessionId);
  // Every app on this Stripe account gets every checkout event. Sessions we did not create are not ours.
  if (!row) return null;
  if (row.status !== 'pending' || !belongs(row)) return row.status;

  const verification = await ctx.provider().verifyPurchase(sessionId);
  await ctx.store.log({
    action: 'verify',
    product: verification.productId,
    sessionId,
    result: verification.paid ? 'paid' : 'not_paid',
  });
  if (!verification.paid) return 'pending';
  if (await ctx.store.markPaid(sessionId, verification.paymentIntentId)) {
    await ctx.store.log({ action: 'unlock', product: verification.productId, sessionId, result: 'paid' });
  }
  // A refund can land between the two calls, so read the status back instead of assuming paid.
  return (await ctx.store.find(sessionId))?.status ?? null;
}

/**
 * POST /api/stripe/webhook. Verifies the signature. Each Stripe event is handled once, and events can
 * arrive in any order: a refund recorded before its payment stays refunded.
 */
export async function handleStripeWebhook(request: Request, ctx: PaymentsContext): Promise<Response> {
  const provider = ctx.provider();
  let event;
  try {
    event = await provider.handleWebhook(request);
  } catch (cause) {
    await ctx.store.log({ action: 'webhook', result: 'invalid_signature', detail: String(cause) });
    return error(400, 'invalid_signature', 'The webhook signature is not valid.');
  }

  if (await ctx.store.seenEvent(event.eventId)) return json({ received: true, duplicate: true });

  switch (event.type) {
    case 'checkout.completed':
      // A completed checkout is not always paid yet, so confirmPurchase asks Stripe.
      await confirmPurchase(ctx, event.sessionId);
      break;
    case 'charge.refunded':
      if (event.sessionId && (await ctx.store.find(event.sessionId))) {
        // A partial refund (a goodwill gesture) keeps the unlock. Only a full refund takes it away.
        const revoked = event.full && (await ctx.store.revoke(event.sessionId, 'refunded'));
        await ctx.store.log({
          action: 'refund',
          sessionId: event.sessionId,
          result: event.full ? (revoked ? 'revoked' : 'already_revoked') : 'partial_kept',
        });
      }
      break;
    case 'charge.disputed':
      if (event.sessionId && (await ctx.store.find(event.sessionId))) {
        await ctx.store.revoke(event.sessionId, 'disputed');
        await ctx.store.log({ action: 'dispute', sessionId: event.sessionId, result: 'revoked' });
      }
      break;
    case 'wrong_mode':
      await ctx.store.log({ action: 'webhook', result: 'wrong_mode', detail: event.eventId });
      break;
    case 'ignored':
      break;
  }
  // Recorded only after it was handled, so if anything above throws, Stripe sends it again.
  await ctx.store.recordEvent(event.eventId, event.type);
  return json({ received: true });
}
