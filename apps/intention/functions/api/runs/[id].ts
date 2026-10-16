import { getRun } from '../../../server/runs.ts';

export const onRequestGet: PagesFunction<Env> = ({ params, env }) => getRun(String(params.id), env.DB);
