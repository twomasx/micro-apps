/** A one-time unlock. Amounts come from each app's config/products.json, never from code. */
export interface Product {
  id: string;
  name: string;
  /** Price in the currency's minor unit (cents). */
  amount: number;
  currency: string;
}

export interface CheckoutSession {
  sessionId: string;
  /** Where to send the buyer to pay. */
  url: string;
}

export interface PurchaseVerification {
  paid: boolean;
  productId: string | null;
}

export type WebhookResult =
  | { type: 'purchase.completed'; sessionId: string; productId: string | null }
  | { type: 'ignored' };

/**
 * One interface for one-time unlocks. Stripe is the only implementation today;
 * an in-app-purchase provider can implement the same interface later.
 */
export interface PaymentsProvider {
  createCheckout(productId: string): Promise<CheckoutSession>;
  verifyPurchase(sessionId: string): Promise<PurchaseVerification>;
  /** Verifies the signature and parses the event. Throws on an invalid signature. */
  handleWebhook(request: Request): Promise<WebhookResult>;
}
