import Stripe from 'stripe';
import { assertKeyMatchesMode, type PaymentsMode } from './settings';
import { PriceMismatchError, type PaymentEvent, type PaymentsProvider, type Product } from './types';

export interface StripePaymentsOptions {
  /** The app's name, like "focus". Namespaces the Stripe prices and marks every session. */
  app: string;
  /** PAYMENTS_MODE. The key must belong to it, and events from the other mode are never acted on. */
  mode: PaymentsMode;
  secretKey: string;
  webhookSecret: string;
  products: readonly Product[];
}

/**
 * The Stripe price for a product is found by this lookup key, so no price ids live in config.
 * scripts/stripe-sync.ts creates the prices from config/products.json in each mode.
 */
export function priceLookupKey(app: string, productId: string): string {
  return `${app}:${productId}`;
}

type Id = string | { id: string } | null | undefined;

function idOf(value: Id): string | null {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id;
}

/** Stripe Checkout behind PaymentsProvider. Runs on Cloudflare Workers (fetch + SubtleCrypto). */
export function createStripePayments(options: StripePaymentsOptions): PaymentsProvider {
  assertKeyMatchesMode(options.secretKey, options.mode);
  const live = options.mode === 'live';

  const stripe = new Stripe(options.secretKey, {
    httpClient: Stripe.createFetchHttpClient(),
  });
  const cryptoProvider = Stripe.createSubtleCryptoProvider();

  /** The Checkout session paid with this payment, or null when there is none. */
  async function sessionFor(paymentIntentId: string | null): Promise<string | null> {
    if (!paymentIntentId) return null;
    const sessions = await stripe.checkout.sessions.list({ payment_intent: paymentIntentId, limit: 1 });
    return sessions.data[0]?.id ?? null;
  }

  return {
    async createCheckout({ productId, successUrl, cancelUrl }) {
      const product = options.products.find((p) => p.id === productId);
      if (!product) throw new Error(`Unknown product: ${productId}`);

      // The price shown in the app comes from config/products.json. Never charge anything else.
      const lookupKey = priceLookupKey(options.app, product.id);
      const prices = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
      const price = prices.data[0];
      if (!price || price.unit_amount !== product.amount || price.currency !== product.currency) {
        throw new PriceMismatchError(
          `Stripe price ${lookupKey} is ${price ? `${price.unit_amount} ${price.currency}` : 'missing'}, config says ${product.amount} ${product.currency}`,
        );
      }

      const metadata = { app: options.app, productId: product.id, mode: options.mode };
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{ price: price.id, quantity: 1 }],
        // Cards only, which includes Apple Pay and Google Pay. No delayed methods such as bank debits,
        // so a purchase is either paid or not when checkout ends.
        allowed_payment_method_types: ['card'],
        metadata,
        payment_intent_data: { metadata },
        success_url: successUrl,
        cancel_url: cancelUrl,
      });
      if (!session.url) throw new Error('Stripe returned no checkout URL');
      return { sessionId: session.id, url: session.url };
    },

    async verifyPurchase(sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      // Sessions made before metadata was added have no app. The caller only asks about sessions in its own table.
      const ours = session.livemode === live && (session.metadata?.app ?? options.app) === options.app;
      const paid = ours && session.status === 'complete' && session.payment_status === 'paid';
      return {
        paid,
        productId: session.metadata?.productId ?? null,
        paymentIntentId: paid ? idOf(session.payment_intent) : null,
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
      return readEvent(event, live, sessionFor);
    },
  };
}

/** Turns a verified Stripe event into what it means for us. Exported for tests. */
export async function readEvent(
  event: Stripe.Event,
  live: boolean,
  sessionFor: (paymentIntentId: string | null) => Promise<string | null>,
): Promise<PaymentEvent> {
  const eventId = event.id;
  if (event.livemode !== live) return { type: 'wrong_mode', eventId };

  switch (event.type) {
    case 'checkout.session.completed':
      return { type: 'checkout.completed', eventId, sessionId: event.data.object.id };
    case 'charge.refunded': {
      const charge = event.data.object;
      const paymentIntentId = idOf(charge.payment_intent);
      // `refunded` is true only once the whole amount is back with the buyer.
      return { type: 'charge.refunded', eventId, sessionId: await sessionFor(paymentIntentId), paymentIntentId, full: charge.refunded };
    }
    case 'charge.dispute.created': {
      const paymentIntentId = idOf(event.data.object.payment_intent);
      return { type: 'charge.disputed', eventId, sessionId: await sessionFor(paymentIntentId), paymentIntentId };
    }
    default:
      return { type: 'ignored', eventId, stripeType: event.type };
  }
}
