import { json } from '@micro/payments/server';
import { appLinks } from '../../server/links.ts';

/** GET /api/links: the apps the success screen opens with a one-time token. */
export const onRequestGet: PagesFunction<Env> = ({ env }) => json({ apps: appLinks(env.EXTRA_APP_LINKS) });
