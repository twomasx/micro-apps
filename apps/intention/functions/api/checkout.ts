import { readSettings } from '@micro/payments/settings';
import { createCheckout, stripePayments } from '../../server/purchases.ts';

export const onRequestPost: PagesFunction<Env> = ({ request, env }) => {
  const settings = readSettings(env);
  return createCheckout(request, env.DB, stripePayments(env, settings.mode), settings, env.PUBLIC_ORIGIN);
};
