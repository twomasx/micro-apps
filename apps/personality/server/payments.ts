import { createStripePayments, type Product } from '@micro/payments';
import {
  confirmPurchase,
  purchaseStore,
  SESSION_ID_PATTERN,
  startCheckout,
  type PaymentsContext,
  type PurchaseRow,
} from '@micro/payments/server';
import { paymentsClosed, readSettings } from '@micro/payments/settings';
import { appConfig } from '../app.config.ts';
import catalog from '../config/products.json';
import { getQuestions } from '../src/lib/questions.ts';
import type { AxisScore } from '../src/lib/scoring.ts';
import { buildReport } from './content.ts';
import { error, json } from './http.ts';
import { findResult, isCoupleUnlocked, isReportUnlocked } from './results.ts';

const PRODUCTS: readonly Product[] = catalog.products;
const MAX_BODY_CHARS = 1_000;

/** Everything the payment routes need for one request, from the Pages environment. Personality has no unlock codes. */
export function paymentsContext(env: Env): PaymentsContext {
  const settings = readSettings(env);
  return {
    settings,
    store: purchaseStore({ db: env.DB, app: appConfig.name, mode: settings.mode }),
    provider: () =>
      createStripePayments({
        app: appConfig.name,
        mode: settings.mode,
        secretKey: env.STRIPE_SECRET_KEY,
        webhookSecret: env.STRIPE_WEBHOOK_SECRET,
        products: PRODUCTS,
      }),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** POST /api/checkout with `{ product, resultId, partnerResultId? }`. Returns `{ url }`. */
export async function createCheckout(
  request: Request,
  db: D1Database,
  ctx: PaymentsContext,
  publicOrigin?: string,
): Promise<Response> {
  // Closed means closed, whatever the request says.
  if (!ctx.settings.enabled) return paymentsClosed();
  const { mode } = ctx.settings;
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
  const hasReport = product.id !== 'couple' && (await isReportUnlocked(db, result.id, mode));
  const hasCouple = partnerId !== null && (await isCoupleUnlocked(db, result.id, partnerId, mode));
  if (product.id === 'report' ? hasReport : product.id === 'couple' ? hasCouple : hasReport && hasCouple) {
    return error(409, 'already_unlocked', 'This is already unlocked.');
  }

  const origin = publicOrigin ?? new URL(request.url).origin;
  // Anything bought for a pair is sold on the compare page, so the buyer goes back there.
  const page =
    partnerId !== null
      ? `${origin}${appConfig.base}c/${result.id}/${partnerId}`
      : `${origin}${appConfig.base}r/${result.id}/report`;
  return startCheckout(
    ctx,
    product,
    { successUrl: `${page}?session_id={CHECKOUT_SESSION_ID}`, cancelUrl: page },
    { product: product.id, result_id: result.id, partner_result_id: partnerId },
  );
}

/**
 * Used when the buyer comes back from Checkout before the webhook has arrived.
 * Only a session that we created, for a purchase that `belongs` accepts, can unlock anything.
 */
export async function confirmSession(
  ctx: PaymentsContext,
  sessionId: string,
  belongs: (purchase: PurchaseRow) => boolean,
): Promise<void> {
  if (!SESSION_ID_PATTERN.test(sessionId)) return;
  await confirmPurchase(ctx, sessionId, belongs);
}

/** GET /api/results/:id/report. 402 until the report is unlocked. */
export async function getReport(
  request: Request,
  id: string,
  db: D1Database,
  ctx: PaymentsContext,
): Promise<Response> {
  const { mode } = ctx.settings;
  const row = await findResult(db, id);
  if (!row) return error(404, 'not_found', 'No result with this id.');

  if (!(await isReportUnlocked(db, row.id, mode))) {
    const sessionId = new URL(request.url).searchParams.get('session_id');
    if (sessionId) {
      await confirmSession(ctx, sessionId, (purchase) => purchase.result_id === row.id);
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
