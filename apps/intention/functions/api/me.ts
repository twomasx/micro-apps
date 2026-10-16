import { readSettings } from '@micro/payments/settings';
import { getMe } from '../../server/me.ts';

export const onRequestGet: PagesFunction<Env> = ({ request, env }) => getMe(request, env.DB, readSettings(env).mode);
