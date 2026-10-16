import { readSettings } from '@micro/payments/settings';
import { getReport, stripePayments } from '../../../../server/payments.ts';

export const onRequestGet: PagesFunction<Env, 'id'> = ({ request, params, env }) => {
  const { mode } = readSettings(env);
  return getReport(request, String(params.id), env.DB, stripePayments(env, mode), mode);
};
