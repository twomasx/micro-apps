import { json } from '@micro/payments/server';
import { paymentsStatus, readSettings } from '@micro/payments/settings';

/** GET /api/payments: whether checkout is open, the mode, and where this deployment runs. */
export const onRequestGet: PagesFunction<Env> = ({ env }) => json(paymentsStatus(readSettings(env)));
