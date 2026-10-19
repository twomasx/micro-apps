import { paymentsClosed } from '../settings';
import type { Product } from '../types';
import { clientAddress, countTry, deviceIdOf, noteAddress, tooManyTries, admitDevice } from './guard';
import { error, isRecord, json, readJson, SESSION_ID_PATTERN } from './http';
import { confirmPurchase, handleStripeWebhook, startCheckout, type PaymentsContext } from './purchases';

export interface UnlockAppConfig {
  /** The app's name, like "focus". */
  app: string;
  /** The app's base path, like "/focus/". Stripe sends buyers back to `${base}unlock`. */
  base: string;
  /** The one product the app sells, like "lifetime". */
  productId: string;
  /** config/products.json */
  products: readonly Product[];
  /** The page Stripe sends buyers back to, under `base`. "unlock" unless said otherwise. */
  returnPage?: string;
}

/**
 * The payment routes of an app that sells one unlock and gives the buyer an unlock code:
 * focus, breathwork, attention and intention.
 */
export function unlockRoutes(config: UnlockAppConfig) {
  const product = config.products.find((candidate) => candidate.id === config.productId);
  if (!product) throw new Error(`No product ${config.productId} in config/products.json`);

  return {
    product,

    /**
     * POST /api/checkout with `{ product }`. Returns `{ url }`, the Stripe Checkout page.
     * `publicOrigin` is PUBLIC_ORIGIN, where Stripe sends the buyer back. Behind the router the request's own
     * origin is the app's pages.dev address, so only local dev may fall back to it.
     */
    async checkout(request: Request, ctx: PaymentsContext, publicOrigin?: string): Promise<Response> {
      // Closed means closed, whatever the request says.
      if (!ctx.settings.enabled) return paymentsClosed();
      const body = await readJson(request);
      if (body instanceof Response) return body;
      if (!isRecord(body) || body.product !== product.id) {
        return error(400, 'unknown_product', `Send { product: "${product.id}" }.`);
      }
      const origin = (publicOrigin || (ctx.settings.environment === 'local' ? new URL(request.url).origin : '')).replace(/\/$/, '');
      if (!origin) {
        await ctx.store.log({ action: 'checkout', product: product.id, result: 'failed', detail: 'PUBLIC_ORIGIN is not set' });
        return error(500, 'checkout_failed', 'The checkout could not be started.');
      }
      const page = `${origin}${config.base}${config.returnPage ?? 'unlock'}`;
      return startCheckout(ctx, product, { successUrl: `${page}?session_id={CHECKOUT_SESSION_ID}`, cancelUrl: page });
    },

    /** POST /api/stripe/webhook */
    webhook: handleStripeWebhook,

    /**
     * GET /api/purchase/:sessionId, for the page Stripe sends the buyer back to.
     * `{ paid: true, code }` once paid, else `{ paid: false, status }`. Works before the webhook arrives.
     */
    async purchase(sessionId: string, ctx: PaymentsContext): Promise<Response> {
      if (!SESSION_ID_PATTERN.test(sessionId)) return error(404, 'not_found', 'No purchase with this id.');
      const status = await confirmPurchase(ctx, sessionId);
      if (status === null) return error(404, 'not_found', 'No purchase with this id.');
      const row = status === 'paid' ? await ctx.store.find(sessionId) : null;
      if (!row) return json({ paid: false, status });
      return json({ paid: true, code: await ctx.store.currentCode(row) });
    },

    /**
     * GET /api/unlock/:code with the device id in X-Device-Id. `{ valid: true, status: 'active' }` when the code
     * belongs to a paid purchase in this mode and this device may use it. Otherwise `valid: false`, with status
     * `unknown` or `device_limit`. Every check counts toward the limit for the caller's network address.
     */
    async unlock(request: Request, input: string, ctx: PaymentsContext): Promise<Response> {
      const { store } = ctx;
      const deviceId = deviceIdOf(request);
      if (!deviceId) return error(400, 'device_required', 'Send the device id in X-Device-Id.');
      const address = await store.hashAddress(clientAddress(request, undefined, ctx.settings.routerKey));
      const rate = await countTry(store.db, address);
      if (!rate.ok) {
        await store.log({ action: 'code_check', result: 'rate_limited' });
        return tooManyTries(rate);
      }

      let text = input;
      try {
        text = decodeURIComponent(input);
      } catch {
        // Not valid percent-encoding. Check it as it is; it will not match.
      }
      const row = await store.findByCode(text);
      const codeHash = row?.unlock_code_hash;
      if (!row || typeof codeHash !== 'string') {
        await store.log({ action: 'code_check', result: 'invalid' });
        return json({ valid: false, status: 'unknown' });
      }
      if ((await admitDevice(store.db, codeHash, config.app, deviceId)) === 'device_limit') {
        await store.log({ action: 'code_check', sessionId: row.stripe_session_id, result: 'device_limit' });
        return json({ valid: false, status: 'device_limit' });
      }
      await noteAddress(store.db, codeHash, address);
      return json({ valid: true, status: 'active' });
    },
  };
}

export type UnlockRoutes = ReturnType<typeof unlockRoutes>;
