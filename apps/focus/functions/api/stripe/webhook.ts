import { readSettings } from '@micro/payments/settings';
import { handleStripeWebhook, stripePayments } from '../../../server/purchases.ts';

export const onRequestPost: PagesFunction<Env> = ({ request, env }) => {
  const { mode } = readSettings(env);
  return handleStripeWebhook(request, env.DB, stripePayments(env, mode), env.UNLOCK_CODE_SECRET, mode);
};
