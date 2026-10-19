import { labPassAccess } from '../../server/labpass.ts';
import { RUN_STARTS, startRun } from '../../server/runs.ts';

export const onRequestPost: PagesFunction<Env> = ({ request, env, waitUntil }) =>
  startRun(request, {
    db: env.DB,
    ...labPassAccess(env),
    waitUntil,
    limit: { secret: env.UNLOCK_CODE_SECRET, routerKey: env.ROUTER_KEY, limits: RUN_STARTS },
  });
