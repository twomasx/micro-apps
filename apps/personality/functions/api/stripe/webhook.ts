import { readSettings } from '@micro/payments/settings';
import { handleStripeWebhook, stripePayments } from '../../../server/payments.ts';

export const onRequestPost: PagesFunction<Env> = ({ request, env }) => {
  const { mode } = readSettings(env);
  return handleStripeWebhook(request, env.DB, stripePayments(env, mode), mode);
};
