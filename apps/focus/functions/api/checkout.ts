import { paymentsContext, purchases } from '../../server/purchases.ts';

export const onRequestPost: PagesFunction<Env> = ({ request, env }) =>
  purchases.checkout(request, paymentsContext(env), env.PUBLIC_ORIGIN);
