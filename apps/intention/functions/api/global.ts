import { edgeCached, getGlobal } from '../../server/totals.ts';

export const onRequestGet: PagesFunction<Env> = ({ request, env }) => {
  const url = new URL(request.url);
  const kind = url.searchParams.get('kind') ?? 'all';
  return edgeCached(request, caches.default, `/api/global?kind=${encodeURIComponent(kind)}`, () => getGlobal(url, env.DB));
};
