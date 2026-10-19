import { createStripePayments, type Product } from '@micro/payments';
import {
  confirmPurchase,
  isRecord,
  purchaseStore,
  readJson,
  requestHasPass,
  SESSION_ID_PATTERN,
  startCheckout,
  type PaymentsContext,
  type PurchaseRow,
  type PurchaseStatus,
} from '@micro/payments/server';
import { paymentsClosed, readSettings } from '@micro/payments/settings';
import { appConfig } from '../app.config.ts';
import catalog from '../config/products.json';
import { getQuestions } from '../src/lib/questions.ts';
import type { AxisScore } from '../src/lib/scoring.ts';
import { buildReport } from './content.ts';
import { error, json } from './http.ts';
import { findResult, isCoupleUnlocked, isReportUnlocked } from './results.ts';

const PRODUCTS: readonly Product[] = catalog.products;

/** Asks the pass service whether this request carries an active all-app pass. */
export function passCheck(request: Request, env: Env): () => Promise<boolean> {
  const { passOrigin, routerKey } = readSettings(env);
  return () => requestHasPass(request, { passOrigin, serviceKey: env.PASS_SERVICE_KEY, routerKey, app: appConfig.name });
}

/** Everything the payment routes need for one request, from the Pages environment. Personality has no unlock codes. */
export function paymentsContext(env: Env): PaymentsContext {
  const settings = readSettings(env);
  return {
    settings,
    store: purchaseStore({ db: env.DB, app: appConfig.name, mode: settings.mode }),
    provider: () =>
      createStripePayments({
        app: appConfig.name,
        mode: settings.mode,
        secretKey: env.STRIPE_SECRET_KEY,
        webhookSecret: env.STRIPE_WEBHOOK_SECRET,
        products: PRODUCTS,
      }),
  };
}

/** POST /api/checkout with `{ product, resultId, partnerResultId? }`. Returns `{ url }`. */
export async function createCheckout(
  request: Request,
  db: D1Database,
  ctx: PaymentsContext,
  publicOrigin?: string,
): Promise<Response> {
  // Closed means closed, whatever the request says.
  if (!ctx.settings.enabled) return paymentsClosed();
  const { mode } = ctx.settings;
  const body = await readJson(request);
  if (body instanceof Response) return body;
  if (!isRecord(body) || typeof body.product !== 'string' || typeof body.resultId !== 'string') {
    return error(400, 'invalid_body', 'Send { product, resultId, partnerResultId? }.');
  }

  const product = PRODUCTS.find((candidate) => candidate.id === body.product);
  if (!product) {
    return error(400, 'unknown_product', `Unknown product ${body.product}.`);
  }
  const result = await findResult(db, body.resultId);
  if (!result) {
    return error(404, 'not_found', 'No result with this id.');
  }

  // The couple report is for one pair of results, so it needs the second one.
  let partnerId: string | null = null;
  if (product.id !== 'report') {
    if (typeof body.partnerResultId !== 'string' || body.partnerResultId === result.id) {
      return error(400, 'partner_required', 'Send partnerResultId, the other result of the pair.');
    }
    const partner = await findResult(db, body.partnerResultId);
    if (!partner) {
      return error(404, 'partner_not_found', 'No result with the partner id.');
    }
    partnerId = partner.id;
  }
  // Never sell something that is already unlocked.
  const hasReport = product.id !== 'couple' && (await isReportUnlocked(db, result.id, mode));
  const hasCouple = partnerId !== null && (await isCoupleUnlocked(db, result.id, partnerId, mode));
  if (product.id === 'report' ? hasReport : product.id === 'couple' ? hasCouple : hasReport && hasCouple) {
    return error(409, 'already_unlocked', 'This is already unlocked.');
  }

  // Behind the router the request's own origin is this app's pages.dev address, where the buyer's saved results
  // are not. So Stripe sends buyers back to PUBLIC_ORIGIN, and only local dev may fall back to the request.
  const origin = (publicOrigin || (ctx.settings.environment === 'local' ? new URL(request.url).origin : '')).replace(
    /\/$/,
    '',
  );
  if (!origin) {
    await ctx.store.log({ action: 'checkout', product: product.id, result: 'failed', detail: 'PUBLIC_ORIGIN is not set' });
    return error(500, 'checkout_failed', 'The checkout could not be started.');
  }
  // Anything bought for a pair is sold on the compare page, so the buyer goes back there.
  const page =
    partnerId !== null
      ? `${origin}${appConfig.base}c/${result.id}/${partnerId}`
      : `${origin}${appConfig.base}r/${result.id}/report`;
  return startCheckout(
    ctx,
    product,
    { successUrl: `${page}?session_id={CHECKOUT_SESSION_ID}`, cancelUrl: page },
    { product: product.id, result_id: result.id, partner_result_id: partnerId },
  );
}

/**
 * Used when the buyer comes back from Checkout before the webhook has arrived.
 * Only a session that we created, for a purchase that `belongs` accepts, can unlock anything.
 * Returns that purchase's status after the check, or null when the session is not one of these.
 */
export async function confirmSession(
  ctx: PaymentsContext,
  sessionId: string,
  belongs: (purchase: PurchaseRow) => boolean,
): Promise<PurchaseStatus | null> {
  if (!SESSION_ID_PATTERN.test(sessionId)) return null;
  const row = await ctx.store.find(sessionId);
  if (!row || !belongs(row)) return null;
  return confirmPurchase(ctx, sessionId);
}

/** True for a purchase that was paid and then refunded or disputed. It unlocks nothing. */
export function isRevoked(status: PurchaseStatus | null): boolean {
  return status === 'refunded' || status === 'disputed';
}

/** What the buyer is told when they come back from a checkout whose payment was refunded or disputed. */
export const REVOKED_MESSAGE = 'This payment was refunded or disputed, so it does not unlock anything.';

/**
 * GET /api/results/:id/report. 402 until the report is unlocked: `payment_revoked` when the buyer came back
 * from a checkout for it that was refunded or disputed, `payment_required` otherwise.
 */
export async function getReport(
  request: Request,
  id: string,
  db: D1Database,
  ctx: PaymentsContext,
  hasPass: () => Promise<boolean> = async () => false,
): Promise<Response> {
  const { mode } = ctx.settings;
  const row = await findResult(db, id);
  if (!row) return error(404, 'not_found', 'No result with this id.');

  if (!(await isReportUnlocked(db, row.id, mode))) {
    const sessionId = new URL(request.url).searchParams.get('session_id');
    const purchase = sessionId
      ? await confirmSession(ctx, sessionId, (candidate) => candidate.result_id === row.id)
      : null;
    // An all-app pass unlocks every report. The pass service is asked; the device never decides.
    if (!(await isReportUnlocked(db, row.id, mode)) && !(await hasPass())) {
      return isRevoked(purchase)
        ? error(402, 'payment_revoked', REVOKED_MESSAGE)
        : error(402, 'payment_required', 'This report is not unlocked.');
    }
  }

  const questions = getQuestions(row.version);
  if (!questions) throw new Error(`No questions for version ${row.version}`);
  return json(
    buildReport(
      { id: row.id, type: row.type, createdAt: row.created_at },
      JSON.parse(row.scores) as AxisScore[],
      questions,
    ),
  );
}
