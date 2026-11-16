import { unlockCheck } from '../../../../server/payments.ts';
import { getReport } from '../../../../server/results.ts';

export const onRequestGet: PagesFunction<Env, 'id'> = ({ request, params, env }) =>
  getReport(String(params.id), env.DB, unlockCheck(request, env));
