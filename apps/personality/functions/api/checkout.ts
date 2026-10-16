import { createCheckout, paymentsContext } from '../../server/payments.ts';

export const onRequestPost: PagesFunction<Env> = ({ request, env }) =>
  createCheckout(request, env.DB, paymentsContext(env), env.PUBLIC_ORIGIN);
