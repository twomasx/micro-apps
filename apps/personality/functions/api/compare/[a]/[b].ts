import { getCompare } from '../../../../server/compare.ts';
import { stripePayments } from '../../../../server/payments.ts';

export const onRequestGet: PagesFunction<Env, 'a' | 'b'> = ({ request, params, env }) =>
  getCompare(request, String(params.a), String(params.b), env.DB, stripePayments(env));
