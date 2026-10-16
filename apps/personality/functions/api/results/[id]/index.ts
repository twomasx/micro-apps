import { readSettings } from '@micro/payments/settings';
import { passCheck } from '../../../../server/payments.ts';
import { deleteResult, getResult } from '../../../../server/results.ts';

export const onRequestGet: PagesFunction<Env, 'id'> = ({ request, params, env }) =>
  getResult(String(params.id), env.DB, readSettings(env).mode, passCheck(request, env));

export const onRequestDelete: PagesFunction<Env, 'id'> = ({ request, params, env }) =>
  deleteResult(request, String(params.id), env.DB);
