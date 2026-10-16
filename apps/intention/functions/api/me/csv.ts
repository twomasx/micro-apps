import { readSettings } from '@micro/payments/settings';
import { getMeCsv } from '../../../server/me.ts';

export const onRequestGet: PagesFunction<Env> = ({ request, env }) => getMeCsv(request, env.DB, readSettings(env).mode);
