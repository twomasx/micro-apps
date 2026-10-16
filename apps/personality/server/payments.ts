import {
  createStripePayments,
  paymentsClosed,
  type PaymentsMode,
  type PaymentsProvider,
  type PaymentsSettings,
  type Product,
} from '@micro/payments';
import { appConfig } from '../app.config.ts';
import catalog from '../config/products.json';
import { getQuestions } from '../src/lib/questions.ts';
import type { AxisScore } from '../src/lib/scoring.ts';
import { buildReport } from './content.ts';
import { error, json } from './http.ts';
import { randomId } from './ids.ts';
import { findResult, isCoupleUnlocked, isReportUnlocked } from './results.ts';

const PRODUCTS: readonly Product[] = catalog.products;
const MAX_BODY_CHARS = 1_000;
// Stripe Checkout session ids look like cs_test_a1B2...
const SESSION_ID_PATTERN = /^cs_[A-Za-z0-9_]{10,250}$/;

export interface CheckoutUrls {
  successUrl: string;
  cancelUrl: string;
}

/** Makes the provider for one request. Tests pass a fake; the routes pass Stripe. */
export type PaymentsFactory = (urls: CheckoutUrls) => PaymentsProvider;

export function stripePayments(env: Env, mode: PaymentsMode): PaymentsFactory {
  return (urls) =>
    createStripePayments({
      mode,
      secretKey: env.STRIPE_SECRET_KEY,
      webhookSecret: env.STRIPE_WEBHOOK_SECRET,
      products: PRODUCTS,
      ...urls,
    });
}

// The webhook and verify calls create no checkout, so they need no return URLs.
const NO_URLS: CheckoutUrls = { successUrl: '', cancelUrl: '' };

export interface PurchaseRow {
  product: string;
  result_id: string;
  partner_result_id: string | null;
  status: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Records a paid checkout. Does nothing the second time, for a session we never created,
 * or for a purchase made in the other mode.
 */
async function markPaid(db: D1Database, sessionId: string, mode: PaymentsMode): Promise<void> {
  await db
    .prepare(`UPDATE purchases SET status = 'paid' WHERE stripe_session_id = ? AND status = 'pending' AND mode = ?`)
    .bind(sessionId, mode)
    .run();
}

/** POST /api/checkout with `{ product, resultId, partnerResultId? }`. Returns `{ url }`. */
export async function createCheckout(
  request: Request,
  db: D1Database,
  payments: PaymentsFactory,
  settings: PaymentsSettings,
  publicOrigin?: string,
): Promise<Response> {
  // The kill switch. Existing unlocks keep working; only new checkouts stop.
  if (!settings.enabled) return paymentsClosed();
  const text = await request.text();
  if (text.length > MAX_BODY_CHARS) {
    return error(413, 'too_large', 'The request body is too large.');
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return error(400, 'invalid_json', 'The request body must be JSON.');
  }
  if (!isRecord(body) || typeof body.product !== 'string' || typeof body.resultId !== 'string') {
    return error(400, 'invalid_body', 'Send { product, resultId, partnerResultId? }.');
  }

  const product = PRODUCTS.find((candidate) => candidate.id === body.product);
  if (!product) {
    return error(400, 'unknown_product', `Unknown product ${body.product}.`);
  }
  const result = await findResult(db, body.resultId);
  if (!result) {
    return error(404, 'not_found', 'No result with this id.');
  }

  // The couple report is for one pair of results, so it needs the second one.
  let partnerId: string | null = null;
  if (product.id !== 'report') {
    if (typeof body.partnerResultId !== 'string' || body.partnerResultId === result.id) {
      return error(400, 'partner_required', 'Send partnerResultId, the other result of the pair.');
    }
    const partner = await findResult(db, body.partnerResultId);
    if (!partner) {
      return error(404, 'partner_not_found', 'No result with the partner id.');
    }
    partnerId = partner.id;
  }
  // Never sell something that is already unlocked.
  const hasReport = product.id !== 'couple' && (await isReportUnlocked(db, result.id, settings.mode));
  const hasCouple = partnerId !== null && (await isCoupleUnlocked(db, result.id, partnerId, settings.mode));
  if (product.id === 'report' ? hasReport : product.id === 'couple' ? hasCouple : hasReport && hasCouple) {
    return error(409, 'already_unlocked', 'This is already unlocked.');
  }

  const origin = publicOrigin ?? new URL(request.url).origin;
  // Anything bought for a pair is sold on the compare page, so the buyer goes back there.
  const page =
    partnerId !== null
      ? `${origin}${appConfig.base}c/${result.id}/${partnerId}`
      : `${origin}${appConfig.base}r/${result.id}/report`;
  const session = await payments({
    successUrl: `${page}?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: page,
  }).createCheckout(product.id);

  // The row starts as pending. Only the webhook or a verified session turns it into paid.
  await db
    .prepare(
      `INSERT INTO purchases
         (id, stripe_session_id, product, result_id, partner_result_id, amount_cents, currency, status, mode, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
    )
    .bind(
      randomId(),
      session.sessionId,
      product.id,
      result.id,
      partnerId,
      product.amount,
      product.currency,
      settings.mode,
      new Date().toISOString(),
    )
    .run();

  return json({ url: session.url }, 201);
}

/** POST /api/stripe/webhook. Safe to receive the same event twice. */
export async function handleStripeWebhook(
  request: Request,
  db: D1Database,
  payments: PaymentsFactory,
  mode: PaymentsMode,
): Promise<Response> {
  const provider = payments(NO_URLS);
  let event;
  try {
    event = await provider.handleWebhook(request);
  } catch {
    return error(400, 'invalid_signature', 'The webhook signature is not valid.');
  }

  if (event.type === 'purchase.completed') {
    // A checkout can complete before the money arrives, so ask Stripe if it is paid.
    const { paid } = await provider.verifyPurchase(event.sessionId);
    if (paid) await markPaid(db, event.sessionId, mode);
  }
  return json({ received: true });
}

/**
 * Used when the buyer comes back from Checkout before the webhook has arrived.
 * Only a session that we created, for a purchase that `belongs` accepts, can unlock anything.
 */
export async function confirmSession(
  db: D1Database,
  payments: PaymentsFactory,
  sessionId: string,
  mode: PaymentsMode,
  belongs: (purchase: PurchaseRow) => boolean,
): Promise<void> {
  if (!SESSION_ID_PATTERN.test(sessionId)) return;
  const purchase = await db
    .prepare(
      'SELECT product, result_id, partner_result_id, status FROM purchases WHERE stripe_session_id = ? AND mode = ?',
    )
    .bind(sessionId, mode)
    .first<PurchaseRow>();
  if (!purchase || purchase.status !== 'pending' || !belongs(purchase)) return;

  const { paid } = await payments(NO_URLS).verifyPurchase(sessionId);
  if (paid) await markPaid(db, sessionId, mode);
}

/** GET /api/results/:id/report. 402 until the report is unlocked. */
export async function getReport(
  request: Request,
  id: string,
  db: D1Database,
  payments: PaymentsFactory,
  mode: PaymentsMode,
): Promise<Response> {
  const row = await findResult(db, id);
  if (!row) return error(404, 'not_found', 'No result with this id.');

  if (!(await isReportUnlocked(db, row.id, mode))) {
    const sessionId = new URL(request.url).searchParams.get('session_id');
    if (sessionId) {
      await confirmSession(db, payments, sessionId, mode, (purchase) => purchase.result_id === row.id);
    }
    if (!(await isReportUnlocked(db, row.id, mode))) {
      return error(402, 'payment_required', 'This report is not unlocked.');
    }
  }

  const questions = getQuestions(row.version);
  if (!questions) throw new Error(`No questions for version ${row.version}`);
  return json(
    buildReport(
      { id: row.id, type: row.type, createdAt: row.created_at },
      JSON.parse(row.scores) as AxisScore[],
      questions,
    ),
  );
}
