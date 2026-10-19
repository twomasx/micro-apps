import { recordTest, TEST_SUBMISSIONS } from '../../server/tests.ts';

export const onRequestPost: PagesFunction<Env> = ({ request, env }) =>
  recordTest(request, env.DB, new Date(), { secret: env.UNLOCK_CODE_SECRET, routerKey: env.ROUTER_KEY, limits: TEST_SUBMISSIONS });
