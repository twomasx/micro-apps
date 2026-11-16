import { createStripePayments, type Product } from '@micro/payments';
import { purchaseStore, requestHasUnlock, unlockRoutes, type PaymentsContext, type UnlockAccess } from '@micro/payments/server';
import { readSettings } from '@micro/payments/settings';
import { appConfig } from '../app.config.ts';
import catalog from '../config/products.json';

const PRODUCTS: readonly Product[] = catalog.products;

/**
 * Checkout, webhook, purchase and unlock code routes: one lifetime unlock with an unlock code, the same as
 * focus, breathwork, attention and intention. The logic lives in packages/payments.
 * Stripe sends the buyer back to /personality/unlock, which shows the code.
 */
export const purchases = unlockRoutes({
  app: appConfig.name,
  base: appConfig.base,
  productId: 'lifetime',
  products: PRODUCTS,
});

/** Everything the payment routes need for one request, from the Pages environment. */
export function paymentsContext(env: Env): PaymentsContext {
  const settings = readSettings(env);
  return {
    settings,
    store: purchaseStore({ db: env.DB, app: appConfig.name, mode: settings.mode, codeSecret: env.UNLOCK_CODE_SECRET }),
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

/** Whether this request may read paid text. Asked at most once per request, and only when needed. */
export type HasUnlock = () => Promise<boolean>;

/**
 * True when the request carries this app's paid unlock code (X-Unlock-Code with X-Device-Id) or an active
 * all-app pass. The device sends what it has; the server decides on every request.
 */
export function unlockCheck(request: Request, env: Env): HasUnlock {
  const { mode, passOrigin, routerKey } = readSettings(env);
  const access: UnlockAccess = {
    db: env.DB,
    app: appConfig.name,
    mode,
    pass: { passOrigin, serviceKey: env.PASS_SERVICE_KEY, routerKey, app: appConfig.name },
  };
  let answer: Promise<boolean> | null = null;
  return () => (answer ??= requestHasUnlock(request, access));
}

/** For tests and callers with nothing unlocked. */
export const LOCKED: HasUnlock = async () => false;
