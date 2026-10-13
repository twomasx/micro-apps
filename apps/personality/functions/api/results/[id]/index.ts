import { deleteResult, getResult } from '../../../../server/results.ts';

export const onRequestGet: PagesFunction<Env, 'id'> = ({ params, env }) =>
  getResult(String(params.id), env.DB);

export const onRequestDelete: PagesFunction<Env, 'id'> = ({ request, params, env }) =>
  deleteResult(request, String(params.id), env.DB);
