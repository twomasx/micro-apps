import { getReport, stripePayments } from '../../../../server/payments.ts';

export const onRequestGet: PagesFunction<Env, 'id'> = ({ request, params, env }) =>
  getReport(request, String(params.id), env.DB, stripePayments(env));
