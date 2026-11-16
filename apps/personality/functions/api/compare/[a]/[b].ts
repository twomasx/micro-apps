import { getCompare } from '../../../../server/compare.ts';
import { unlockCheck } from '../../../../server/payments.ts';

export const onRequestGet: PagesFunction<Env, 'a' | 'b'> = ({ request, params, env }) =>
  getCompare(String(params.a), String(params.b), env.DB, unlockCheck(request, env));
