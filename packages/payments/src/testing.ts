/** Test helpers for the apps' payment tests. Import from '@micro/payments/testing'. Never used in production code. */
import type { CheckoutInput, PaymentEvent, PaymentsProvider } from './types';

let nextSession = 1;

/**
 * Stands in for Stripe. `paid` is what Stripe would say has been paid.
 * The webhook trusts the signature header "good" and reads the event from the JSON body.
 */
export class FakeProvider implements PaymentsProvider {
  paid = new Map<string, string>();
  checkouts: CheckoutInput[] = [];
  verifyCalls = 0;
  failCheckout: Error | null = null;

  constructor(private readonly prefix = 'cs_test_fake') {}

  async createCheckout(input: CheckoutInput) {
    if (this.failCheckout) throw this.failCheckout;
    this.checkouts.push(input);
    const sessionId = `${this.prefix}${String(nextSession++).padStart(10, '0')}`;
    return { sessionId, url: `https://checkout.example/${sessionId}` };
  }

  async verifyPurchase(sessionId: string) {
    this.verifyCalls += 1;
    const paymentIntentId = this.paid.get(sessionId) ?? null;
    return { paid: paymentIntentId !== null, productId: 'lifetime', paymentIntentId };
  }

  async handleWebhook(request: Request): Promise<PaymentEvent> {
    if (request.headers.get('stripe-signature') !== 'good') throw new Error('bad signature');
    return (await request.json()) as PaymentEvent;
  }

  /** Marks a session paid, the way Stripe would after the card goes through. */
  pay(sessionId: string): string {
    const paymentIntentId = `pi_${sessionId.slice(-10)}`;
    this.paid.set(sessionId, paymentIntentId);
    return paymentIntentId;
  }
}

let nextEvent = 1;
export const eventId = () => `evt_test_${String(nextEvent++).padStart(8, '0')}`;

export function webhookRequest(event: PaymentEvent, signature = 'good'): Request {
  return new Request('http://localhost/api/stripe/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': signature },
    body: JSON.stringify(event),
  });
}
