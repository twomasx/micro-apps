import { getMe } from '../../server/me.ts';
import { labPassAccess } from '../../server/labpass.ts';

export const onRequestGet: PagesFunction<Env> = ({ request, env }) => getMe(request, env.DB, labPassAccess(env));
