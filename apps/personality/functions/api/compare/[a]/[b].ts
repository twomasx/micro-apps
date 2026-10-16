import { getCompare } from '../../../../server/compare.ts';
import { passCheck, paymentsContext } from '../../../../server/payments.ts';

export const onRequestGet: PagesFunction<Env, 'a' | 'b'> = ({ request, params, env }) =>
  getCompare(request, String(params.a), String(params.b), env.DB, paymentsContext(env), passCheck(request, env));
