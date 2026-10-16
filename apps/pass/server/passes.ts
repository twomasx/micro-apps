import { createStripePayments } from '@micro/payments';
import { PASS_CODES, purchaseStore, unlockRoutes, type PaymentsContext } from '@micro/payments/server';
import { readSettings } from '@micro/payments/settings';
import { appConfig } from '../app.config.ts';
import catalog from '../config/products.json';

/** Checkout, webhook and the success page's purchase lookup. The logic lives in packages/payments. */
export const passes = unlockRoutes({
  app: appConfig.name,
  base: appConfig.base,
  productId: 'pass',
  products: catalog.products,
  returnPage: 'thanks',
});

/** Everything the payment routes need for one request, from the Pages environment. */
export function paymentsContext(env: Env): PaymentsContext {
  const settings = readSettings(env);
  return {
    settings,
    store: purchaseStore({
      db: env.DB,
      app: appConfig.name,
      mode: settings.mode,
      codeSecret: env.PASS_CODE_SECRET,
      codes: PASS_CODES,
    }),
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
