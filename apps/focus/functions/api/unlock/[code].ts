import { paymentsContext, purchases } from '../../../server/purchases.ts';

export const onRequestGet: PagesFunction<Env, 'code'> = ({ params, env }) =>
  purchases.unlock(String(params.code), paymentsContext(env));
