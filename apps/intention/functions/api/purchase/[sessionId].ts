import { readSettings } from '@micro/payments/settings';
import { getPurchase, stripePayments } from '../../../server/purchases.ts';

export const onRequestGet: PagesFunction<Env, 'sessionId'> = ({ params, env }) => {
  const { mode } = readSettings(env);
  return getPurchase(String(params.sessionId), env.DB, stripePayments(env, mode), env.UNLOCK_CODE_SECRET, mode);
};
