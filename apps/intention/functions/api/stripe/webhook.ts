import { paymentsContext, purchases } from '../../../server/purchases.ts';

export const onRequestPost: PagesFunction<Env> = ({ request, env }) => purchases.webhook(request, paymentsContext(env));
