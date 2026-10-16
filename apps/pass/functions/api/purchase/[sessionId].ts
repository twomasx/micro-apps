import { passes, paymentsContext } from '../../../server/passes.ts';

export const onRequestGet: PagesFunction<Env, 'sessionId'> = ({ params, env }) =>
  passes.purchase(String(params.sessionId), paymentsContext(env));
