import { getPurchase, stripePayments } from '../../../server/purchases.ts';

export const onRequestGet: PagesFunction<Env, 'sessionId'> = ({ params, env }) =>
  getPurchase(String(params.sessionId), env.DB, stripePayments(env), env.UNLOCK_CODE_SECRET);
