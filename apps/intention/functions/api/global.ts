import { getGlobal } from '../../server/totals.ts';

export const onRequestGet: PagesFunction<Env> = ({ request, env }) => getGlobal(new URL(request.url), env.DB);
