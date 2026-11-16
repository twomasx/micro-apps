import { paymentsContext, purchases } from '../../../server/payments.ts';

export const onRequestPost: PagesFunction<Env> = ({ request, env }) => purchases.webhook(request, paymentsContext(env));
