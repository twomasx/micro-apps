import { createStripePayments } from '@micro/payments';
import { purchaseStore, unlockRoutes, type PaymentsContext } from '@micro/payments/server';
import { readSettings } from '@micro/payments/settings';
import { appConfig } from '../app.config.ts';
import catalog from '../config/products.json';

/** Checkout, webhook, purchase and unlock code routes. The logic lives in packages/payments. */
export const purchases = unlockRoutes({
  app: appConfig.name,
  base: appConfig.base,
  productId: 'labpass',
  products: catalog.products,
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
        products: catalog.products,
      }),
  };
}
