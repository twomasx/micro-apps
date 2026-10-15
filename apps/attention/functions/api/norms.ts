import { getNorms } from '../../server/tests.ts';

export const onRequestGet: PagesFunction<Env> = ({ request, env }) => getNorms(request, env.DB, caches.default);
