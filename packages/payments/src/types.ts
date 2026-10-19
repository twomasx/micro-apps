/** A one-time unlock. Amounts come from each app's config/products.json, never from code. */
export interface Product {
  id: string;
  name: string;
  /** Price in the currency's minor unit (cents). */
  amount: number;
  currency: string;
}

export interface CheckoutInput {
  productId: string;
  /** Include {CHECKOUT_SESSION_ID} so the app can confirm the purchase on return. */
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSession {
  sessionId: string;
  /** Where to send the buyer to pay. */
  url: string;
}

export interface PurchaseVerification {
  /** True only when Stripe says the money is in and the session belongs to this app and mode. */
  paid: boolean;
  productId: string | null;
  /** Links refunds and disputes back to the purchase. Null until paid. */
  paymentIntentId: string | null;
}

/** What a verified Stripe webhook means for us. Every variant carries the Stripe event id. */
export type PaymentEvent =
  | { type: 'checkout.completed'; eventId: string; sessionId: string }
  /** `full` is false for a partial refund, which keeps the unlock. */
  | { type: 'charge.refunded'; eventId: string; sessionId: string | null; paymentIntentId: string | null; full: boolean }
  | { type: 'charge.disputed'; eventId: string; sessionId: string | null; paymentIntentId: string | null }
  /** `won` is true when the dispute closed in our favor (won, or an inquiry closed with no chargeback). */
  | { type: 'dispute.closed'; eventId: string; sessionId: string | null; paymentIntentId: string | null; won: boolean }
  /** An event made in the other mode. Never acted on. */
  | { type: 'wrong_mode'; eventId: string }
  | { type: 'ignored'; eventId: string; stripeType: string };

/**
 * One interface for one-time unlocks. Stripe is the only implementation today;
 * an in-app-purchase provider can implement the same interface later.
 */
export interface PaymentsProvider {
  createCheckout(input: CheckoutInput): Promise<CheckoutSession>;
  /** Asks Stripe directly. Used when the buyer comes back before the webhook. */
  verifyPurchase(sessionId: string): Promise<PurchaseVerification>;
  /** Verifies the signature and reads the event. Throws on a missing or invalid signature. */
  handleWebhook(request: Request): Promise<PaymentEvent>;
}

/** Thrown when the Stripe price for a product is missing or differs from config/products.json. */
export class PriceMismatchError extends Error {
  override name = 'PriceMismatchError';
}
