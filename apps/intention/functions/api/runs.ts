import { labPassAccess } from '../../server/labpass.ts';
import { startRun } from '../../server/runs.ts';

export const onRequestPost: PagesFunction<Env> = ({ request, env, waitUntil }) =>
  startRun(request, { db: env.DB, ...labPassAccess(env), waitUntil });
