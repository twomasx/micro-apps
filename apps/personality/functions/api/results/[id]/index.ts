import { unlockCheck } from '../../../../server/payments.ts';
import { deleteResult, getResult } from '../../../../server/results.ts';

export const onRequestGet: PagesFunction<Env, 'id'> = ({ request, params, env }) =>
  getResult(String(params.id), env.DB, unlockCheck(request, env));

export const onRequestDelete: PagesFunction<Env, 'id'> = ({ request, params, env }) =>
  deleteResult(request, String(params.id), env.DB);
