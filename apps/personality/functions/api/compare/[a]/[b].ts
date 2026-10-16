import { readSettings } from '@micro/payments/settings';
import { getCompare } from '../../../../server/compare.ts';
import { stripePayments } from '../../../../server/payments.ts';

export const onRequestGet: PagesFunction<Env, 'a' | 'b'> = ({ request, params, env }) => {
  const { mode } = readSettings(env);
  return getCompare(request, String(params.a), String(params.b), env.DB, stripePayments(env, mode), mode);
};
