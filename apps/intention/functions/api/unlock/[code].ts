import { paymentsContext, purchases } from '../../../server/purchases.ts';

export const onRequestGet: PagesFunction<Env, 'code'> = ({ request, params, env }) =>
  purchases.unlock(request, String(params.code), paymentsContext(env));
