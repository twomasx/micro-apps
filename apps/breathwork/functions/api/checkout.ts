import { createCheckout, stripePayments } from '../../server/purchases.ts';

export const onRequestPost: PagesFunction<Env> = ({ request, env }) =>
  createCheckout(request, env.DB, stripePayments(env), env.PUBLIC_ORIGIN);
