import { edgeCached, getHour } from '../../server/totals.ts';

export const onRequestGet: PagesFunction<Env> = ({ request, env }) =>
  edgeCached(request, caches.default, '/api/hour', () => getHour(env.DB));
