import { getMeCsv } from '../../../server/me.ts';
import { labPassAccess } from '../../../server/labpass.ts';

export const onRequestGet: PagesFunction<Env> = ({ request, env }) => getMeCsv(request, env.DB, labPassAccess(env));
