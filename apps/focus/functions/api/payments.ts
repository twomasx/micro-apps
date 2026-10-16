import { paymentsStatus, readSettings } from '@micro/payments/settings';
import { json } from '../../server/http.ts';

/** GET /api/payments: whether checkout is open, the mode, and where this deployment runs. */
export const onRequestGet: PagesFunction<Env> = ({ env }) => json(paymentsStatus(readSettings(env)));
