import { startRun } from '../../server/runs.ts';

export const onRequestPost: PagesFunction<Env> = ({ request, env, waitUntil }) =>
  startRun(request, { db: env.DB, waitUntil });
