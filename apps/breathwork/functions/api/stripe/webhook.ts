import { handleStripeWebhook, stripePayments } from '../../../server/purchases.ts';

export const onRequestPost: PagesFunction<Env> = ({ request, env }) =>
  handleStripeWebhook(request, env.DB, stripePayments(env), env.UNLOCK_CODE_SECRET);
