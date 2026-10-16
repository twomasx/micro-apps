import { handleStripeWebhook } from '@micro/payments/server';
import { paymentsContext } from '../../../server/payments.ts';

export const onRequestPost: PagesFunction<Env> = ({ request, env }) => handleStripeWebhook(request, paymentsContext(env));
