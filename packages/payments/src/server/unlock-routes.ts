import { paymentsClosed } from '../settings';
import type { Product } from '../types';
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

    /** POST /api/checkout with `{ product }`. Returns `{ url }`, the Stripe Checkout page. */
    async checkout(request: Request, ctx: PaymentsContext, publicOrigin?: string): Promise<Response> {
      // Closed means closed, whatever the request says.
      if (!ctx.settings.enabled) return paymentsClosed();
      const body = await readJson(request);
      if (body instanceof Response) return body;
      if (!isRecord(body) || body.product !== product.id) {
        return error(400, 'unknown_product', `Send { product: "${product.id}" }.`);
      }
      const page = `${publicOrigin ?? new URL(request.url).origin}${config.base}${config.returnPage ?? 'unlock'}`;
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

    /** GET /api/unlock/:code. `{ valid: true }` when the code belongs to a paid purchase in this mode. */
    async unlock(input: string, ctx: PaymentsContext): Promise<Response> {
      let text = input;
      try {
        text = decodeURIComponent(input);
      } catch {
        // Not valid percent-encoding. Check it as it is; it will not match.
      }
      const row = await ctx.store.findByCode(text);
      if (!row) await ctx.store.log({ action: 'code_check', result: 'invalid' });
      return json({ valid: row !== null });
    },
  };
}

export type UnlockRoutes = ReturnType<typeof unlockRoutes>;
