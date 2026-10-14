import { createStripePayments, type PaymentsProvider, type Product } from '@micro/payments';
import { formatCode, hashCode, normalizeCode, unlockCodeFor } from '@micro/payments/unlock-codes';
import { appConfig } from '../app.config.ts';
import catalog from '../config/products.json';
import { error, json, randomId } from './http.ts';

const PRODUCTS: readonly Product[] = catalog.products;
const LIFETIME = 'lifetime';
const MAX_BODY_CHARS = 1_000;
// Stripe Checkout session ids look like cs_test_a1B2...
const SESSION_ID_PATTERN = /^cs_[A-Za-z0-9_]{10,250}$/;

export interface CheckoutUrls {
  successUrl: string;
  cancelUrl: string;
}

/** Makes the provider for one request. Tests pass a fake; the routes pass Stripe. */
export type PaymentsFactory = (urls: CheckoutUrls) => PaymentsProvider;

export function stripePayments(env: Env): PaymentsFactory {
  return (urls) =>
    createStripePayments({
      secretKey: env.STRIPE_SECRET_KEY,
      webhookSecret: env.STRIPE_WEBHOOK_SECRET,
      products: PRODUCTS,
      ...urls,
    });
}

// The webhook and verify calls create no checkout, so they need no return URLs.
const NO_URLS: CheckoutUrls = { successUrl: '', cancelUrl: '' };

interface PurchaseRow {
  status: string;
}

function findPurchase(db: D1Database, sessionId: string): Promise<PurchaseRow | null> {
  return db.prepare('SELECT status FROM purchases WHERE stripe_session_id = ?').bind(sessionId).first<PurchaseRow>();
}

/** Records a paid checkout with the hash of its unlock code. Does nothing the second time. */
async function markPaid(db: D1Database, sessionId: string, codeSecret: string): Promise<void> {
  const codeHash = await hashCode(await unlockCodeFor(codeSecret, sessionId));
  await db
    .prepare(
      `UPDATE purchases SET status = 'paid', unlock_code_hash = ? WHERE stripe_session_id = ? AND status = 'pending'`,
    )
    .bind(codeHash, sessionId)
    .run();
}

/** Asks Stripe about a pending purchase of ours and records it if it is paid. Returns the status after. */
async function confirm(
  db: D1Database,
  provider: () => PaymentsProvider,
  sessionId: string,
  codeSecret: string,
): Promise<string | null> {
  const purchase = await findPurchase(db, sessionId);
  // Every app on this Stripe account gets every checkout event. Sessions we did not create are not ours.
  if (!purchase || purchase.status !== 'pending') return purchase?.status ?? null;
  const { paid } = await provider().verifyPurchase(sessionId);
  if (!paid) return 'pending';
  await markPaid(db, sessionId, codeSecret);
  return 'paid';
}

/** POST /api/checkout with `{ product: 'lifetime' }`. Returns `{ url }`, the Stripe Checkout page. */
export async function createCheckout(
  request: Request,
  db: D1Database,
  payments: PaymentsFactory,
  publicOrigin?: string,
): Promise<Response> {
  const text = await request.text();
  if (text.length > MAX_BODY_CHARS) return error(413, 'too_large', 'The request body is too large.');
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return error(400, 'invalid_json', 'The request body must be JSON.');
  }
  const productId = typeof body === 'object' && body !== null ? (body as Record<string, unknown>).product : null;
  const product = PRODUCTS.find((candidate) => candidate.id === productId);
  if (!product || product.id !== LIFETIME) return error(400, 'unknown_product', 'Send { product: "lifetime" }.');

  const page = `${publicOrigin ?? new URL(request.url).origin}${appConfig.base}unlock`;
  const session = await payments({
    successUrl: `${page}?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: page,
  }).createCheckout(product.id);

  // The row starts as pending. Only the webhook or a session confirmed with Stripe turns it into paid.
  await db
    .prepare(
      `INSERT INTO purchases (id, stripe_session_id, unlock_code_hash, amount_cents, currency, status, created_at)
       VALUES (?, ?, NULL, ?, ?, 'pending', ?)`,
    )
    .bind(randomId(), session.sessionId, product.amount, product.currency, new Date().toISOString())
    .run();

  return json({ url: session.url }, 201);
}

/** POST /api/stripe/webhook. Checks the signature. Safe to receive the same event twice. */
export async function handleStripeWebhook(
  request: Request,
  db: D1Database,
  payments: PaymentsFactory,
  codeSecret: string,
): Promise<Response> {
  const provider = payments(NO_URLS);
  let event;
  try {
    event = await provider.handleWebhook(request);
  } catch {
    return error(400, 'invalid_signature', 'The webhook signature is not valid.');
  }
  // A checkout can complete before the money arrives, so confirm asks Stripe if it is paid.
  if (event.type === 'purchase.completed') await confirm(db, () => provider, event.sessionId, codeSecret);
  return json({ received: true });
}

/**
 * GET /api/purchase/:sessionId, for the page Stripe sends the buyer back to.
 * Returns `{ paid: true, code }` once paid, else `{ paid: false }`. Works before the webhook arrives.
 */
export async function getPurchase(
  sessionId: string,
  db: D1Database,
  payments: PaymentsFactory,
  codeSecret: string,
): Promise<Response> {
  if (!SESSION_ID_PATTERN.test(sessionId)) return error(404, 'not_found', 'No purchase with this id.');
  const status = await confirm(db, () => payments(NO_URLS), sessionId, codeSecret);
  if (status === null) return error(404, 'not_found', 'No purchase with this id.');
  if (status !== 'paid') return json({ paid: false });
  return json({ paid: true, code: formatCode(await unlockCodeFor(codeSecret, sessionId)) });
}

/** GET /api/unlock/:code. `{ valid: true }` when the code belongs to a paid purchase. */
export async function checkUnlockCode(input: string, db: D1Database): Promise<Response> {
  let text = input;
  try {
    text = decodeURIComponent(input);
  } catch {
    // Not valid percent-encoding. Check it as it is; it will not match.
  }
  const code = normalizeCode(text);
  if (!code) return json({ valid: false });
  const row = await db
    .prepare(`SELECT 1 AS found FROM purchases WHERE unlock_code_hash = ? AND status = 'paid'`)
    .bind(await hashCode(code))
    .first();
  return json({ valid: row !== null });
}
