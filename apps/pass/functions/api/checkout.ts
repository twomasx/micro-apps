import { passes, paymentsContext } from '../../server/passes.ts';

export const onRequestPost: PagesFunction<Env> = ({ request, env }) =>
  passes.checkout(request, paymentsContext(env), env.PUBLIC_ORIGIN);
