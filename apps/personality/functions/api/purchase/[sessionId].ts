import { paymentsContext, purchases } from '../../../server/payments.ts';

export const onRequestGet: PagesFunction<Env, 'sessionId'> = ({ params, env }) =>
  purchases.purchase(String(params.sessionId), paymentsContext(env));
