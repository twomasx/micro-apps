import { paymentsContext, purchases } from '../../../server/payments.ts';

export const onRequestGet: PagesFunction<Env, 'code'> = ({ request, params, env }) =>
  purchases.unlock(request, String(params.code), paymentsContext(env));
