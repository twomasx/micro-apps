import Stripe from 'stripe';
import type { PaymentsProvider, Product } from './types';

export interface StripePaymentsOptions {
  secretKey: string;
  webhookSecret: string;
  products: readonly Product[];
  /** Include {CHECKOUT_SESSION_ID} so the app can call verifyPurchase on return. */
  successUrl: string;
  cancelUrl: string;
}

/** Stripe Checkout behind PaymentsProvider. Runs on Cloudflare Workers (fetch + SubtleCrypto). */
export function createStripePayments(options: StripePaymentsOptions): PaymentsProvider {
  // Test mode only for now.
  if (!options.secretKey.startsWith('sk_test_')) {
    throw new Error('Stripe secret key must be a test mode key (sk_test_...)');
  }

  const stripe = new Stripe(options.secretKey, {
    httpClient: Stripe.createFetchHttpClient(),
  });
  const cryptoProvider = Stripe.createSubtleCryptoProvider();

  return {
    async createCheckout(productId) {
      const product = options.products.find((p) => p.id === productId);
      if (!product) throw new Error(`Unknown product: ${productId}`);

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: product.currency,
              unit_amount: product.amount,
              product_data: { name: product.name },
            },
          },
        ],
        metadata: { productId },
        success_url: options.successUrl,
        cancel_url: options.cancelUrl,
      });
      if (!session.url) throw new Error('Stripe returned no checkout URL');
      return { sessionId: session.id, url: session.url };
    },

    async verifyPurchase(sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      return {
        paid: session.payment_status === 'paid',
        productId: session.metadata?.productId ?? null,
      };
    },

    async handleWebhook(request) {
      const signature = request.headers.get('stripe-signature');
      if (!signature) throw new Error('Missing stripe-signature header');

      const event = await stripe.webhooks.constructEventAsync(
        await request.text(),
        signature,
        options.webhookSecret,
        undefined,
        cryptoProvider,
      );
      if (event.type !== 'checkout.session.completed') return { type: 'ignored' };

      const session = event.data.object;
      return {
        type: 'purchase.completed',
        sessionId: session.id,
        productId: session.metadata?.productId ?? null,
      };
    },
  };
}
