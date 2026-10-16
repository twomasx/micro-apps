import { passes, paymentsContext } from '../../../server/passes.ts';

export const onRequestPost: PagesFunction<Env> = ({ request, env }) => passes.webhook(request, paymentsContext(env));
