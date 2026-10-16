import { readSettings } from '@micro/payments/settings';
import { startRun } from '../../server/runs.ts';

export const onRequestPost: PagesFunction<Env> = ({ request, env, waitUntil }) =>
  startRun(request, { db: env.DB, mode: readSettings(env).mode, waitUntil });
