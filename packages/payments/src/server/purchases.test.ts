import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import schema from '../../test/schema.sql?raw';
import { createTestDb, type TestDb } from '../../test/db';
import { eventId, FakeProvider, webhookRequest } from '../testing';
import type { PaymentsMode, PaymentsSettings } from '../settings';
import { PriceMismatchError, type PaymentEvent, type Product } from '../types';
import { formatCode, hashCode, unlockCodeFor } from '../unlock-codes';
import type { PaymentsContext } from './purchases';
import { purchaseStore, type PurchaseRow } from './store';
import { unlockRoutes } from './unlock-routes';

const SECRET = 'test-secret-that-is-long-enough-0123456789';
const PRODUCTS: Product[] = [{ id: 'lifetime', name: 'Lifetime unlock', amount: 699, currency: 'usd' }];
const routes = unlockRoutes({ app: 'focus', base: '/focus/', productId: 'lifetime', products: PRODUCTS });

let testDb: TestDb;
let db: D1Database;
let fake: FakeProvider;

beforeAll(async () => {
  testDb = await createTestDb(schema);
  db = testDb.db;
});

afterAll(async () => {
  await testDb.dispose();
});

beforeEach(() => {
  fake = new FakeProvider();
});

function context(settings: Partial<PaymentsSettings> = {}): PaymentsContext {
  const full: PaymentsSettings = { enabled: true, mode: 'test', environment: 'local', ...settings };
  return {
    store: purchaseStore({ db, app: 'focus', mode: full.mode, codeSecret: SECRET }),
    settings: full,
    provider: () => fake,
  };
}

function checkout(body: unknown, settings: Partial<PaymentsSettings> = {}): Promise<Response> {
  const request = new Request('http://127.0.0.1:8802/api/checkout', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  return routes.checkout(request, context(settings), 'https://example.test');
}

async function startCheckout(): Promise<string> {
  const response = await checkout({ product: 'lifetime' });
  expect(response.status).toBe(201);
  const { url } = (await response.json()) as { url: string };
  return url.replace('https://checkout.example/', '');
}

function webhook(event: PaymentEvent, signature = 'good', mode: PaymentsMode = 'test'): Promise<Response> {
  return routes.webhook(webhookRequest(event, signature), context({ mode }));
}

const completed = (sessionId: string): PaymentEvent => ({ type: 'checkout.completed', eventId: eventId(), sessionId });
const refunded = (sessionId: string, full = true): PaymentEvent => ({
  type: 'charge.refunded',
  eventId: eventId(),
  sessionId,
  paymentIntentId: null,
  full,
});
const disputed = (sessionId: string): PaymentEvent => ({
  type: 'charge.disputed',
  eventId: eventId(),
  sessionId,
  paymentIntentId: null,
});

async function purchase(sessionId: string, mode: PaymentsMode = 'test') {
  const response = await routes.purchase(sessionId, context({ mode }));
  return { status: response.status, body: (await response.json()) as { paid?: boolean; code?: string; status?: string } };
}

async function check(code: string, mode: PaymentsMode = 'test'): Promise<boolean> {
  const response = await routes.unlock(code, context({ mode }));
  return ((await response.json()) as { valid: boolean }).valid;
}

function row(sessionId: string): Promise<PurchaseRow | null> {
  return db.prepare('SELECT * FROM purchases WHERE stripe_session_id = ?').bind(sessionId).first<PurchaseRow>();
}

async function paidPurchase(): Promise<{ sessionId: string; code: string }> {
  const sessionId = await startCheckout();
  fake.pay(sessionId);
  expect((await webhook(completed(sessionId))).status).toBe(200);
  return { sessionId, code: await unlockCodeFor(SECRET, sessionId) };
}

async function logFor(sessionId: string): Promise<string[]> {
  const { results } = await db
    .prepare('SELECT action, result FROM payment_log WHERE session_id = ? ORDER BY id')
    .bind(sessionId)
    .all<{ action: string; result: string }>();
  return results.map((entry) => `${entry.action}:${entry.result}`);
}

describe('checkout', () => {
  it('starts a checkout, records a pending purchase in this mode and logs it', async () => {
    const sessionId = await startCheckout();
    expect(fake.checkouts[0]).toEqual({
      productId: 'lifetime',
      successUrl: 'https://example.test/focus/unlock?session_id={CHECKOUT_SESSION_ID}',
      cancelUrl: 'https://example.test/focus/unlock',
    });
    expect(await row(sessionId)).toMatchObject({ status: 'pending', mode: 'test', amount_cents: 699, unlock_code_hash: null });
    expect(await logFor(sessionId)).toEqual(['checkout:started']);
  });

  it('refuses other products and bad bodies', async () => {
    expect((await checkout({ product: 'report' })).status).toBe(400);
    expect((await checkout({})).status).toBe(400);
    expect((await checkout('not json')).status).toBe(400);
    expect((await checkout({ product: 'lifetime', pad: 'x'.repeat(2000) })).status).toBe(413);
  });

  it('kill switch off: answers 503 and never reaches Stripe', async () => {
    const response = await checkout({ product: 'lifetime' }, { enabled: false });
    expect(response.status).toBe(503);
    expect((await checkout('not json', { enabled: false })).status).toBe(503);
    expect(fake.checkouts).toHaveLength(0);
  });

  it('kill switch off: unlocks already bought keep working', async () => {
    const { code } = await paidPurchase();
    // Nothing in the code check reads the kill switch.
    const response = await routes.unlock(code, context({ enabled: false }));
    expect(await response.json()).toEqual({ valid: true });
  });

  it('a price that differs from Stripe stops the checkout and is logged', async () => {
    fake.failCheckout = new PriceMismatchError('Stripe price focus:lifetime is 599 usd, config says 699 usd');
    expect((await checkout({ product: 'lifetime' })).status).toBe(502);
    const entry = await db
      .prepare(`SELECT result, detail FROM payment_log WHERE action = 'checkout' ORDER BY id DESC LIMIT 1`)
      .first<{ result: string; detail: string }>();
    expect(entry?.result).toBe('price_mismatch');
  });
});

describe('webhook', () => {
  it('a valid signature unlocks, and only the hash of the code is stored', async () => {
    const { sessionId, code } = await paidPurchase();
    const saved = await row(sessionId);
    expect(saved).toMatchObject({ status: 'paid', payment_intent_id: `pi_${sessionId.slice(-10)}`, code_generation: 0 });
    expect(saved?.unlock_code_hash).toBe(await hashCode(code));
    // The code itself is nowhere in the database.
    const everything = JSON.stringify(
      (await db.prepare('SELECT * FROM purchases').all()).results.concat((await db.prepare('SELECT * FROM payment_log').all()).results),
    );
    expect(everything).not.toContain(code);
    expect(await logFor(sessionId)).toEqual(['checkout:started', 'verify:paid', 'unlock:paid']);
  });

  it('a bad signature returns 400 and changes nothing', async () => {
    const sessionId = await startCheckout();
    fake.pay(sessionId);
    const event = completed(sessionId);
    expect((await webhook(event, 'bad')).status).toBe(400);
    expect((await row(sessionId))?.status).toBe('pending');
    expect(fake.verifyCalls).toBe(0);
    // Not recorded as seen, so the real event is still handled.
    expect((await webhook(event)).status).toBe(200);
    expect((await row(sessionId))?.status).toBe('paid');
  });

  it('the same event twice unlocks once', async () => {
    const sessionId = await startCheckout();
    fake.pay(sessionId);
    const event = completed(sessionId);
    await webhook(event);
    const first = await row(sessionId);
    const again = await webhook(event);
    expect(await again.json()).toEqual({ received: true, duplicate: true });
    expect(await row(sessionId)).toEqual(first);
    expect(fake.verifyCalls).toBe(1);
    expect((await logFor(sessionId)).filter((entry) => entry === 'unlock:paid')).toHaveLength(1);
  });

  it('leaves an unpaid checkout pending', async () => {
    const sessionId = await startCheckout();
    await webhook(completed(sessionId));
    expect((await row(sessionId))?.status).toBe('pending');
  });

  it('ignores sessions this app did not create, without asking Stripe', async () => {
    expect((await webhook(completed('cs_test_someoneelse0001'))).status).toBe(200);
    expect((await webhook(refunded('cs_test_someoneelse0001'))).status).toBe(200);
    expect(fake.verifyCalls).toBe(0);
    expect(await row('cs_test_someoneelse0001')).toBeNull();
  });

  it('a refund after the payment revokes the unlock', async () => {
    const { sessionId, code } = await paidPurchase();
    expect(await check(code)).toBe(true);
    await webhook(refunded(sessionId));
    expect((await row(sessionId))?.status).toBe('refunded');
    expect(await check(code)).toBe(false);
    expect(await logFor(sessionId)).toContain('refund:revoked');
  });

  it('a refund that arrives before the payment still ends revoked', async () => {
    const sessionId = await startCheckout();
    fake.pay(sessionId);
    await webhook(refunded(sessionId));
    await webhook(completed(sessionId));
    expect((await row(sessionId))?.status).toBe('refunded');
    expect(await check(await unlockCodeFor(SECRET, sessionId))).toBe(false);
    expect((await purchase(sessionId)).body).toEqual({ paid: false, status: 'refunded' });
  });

  it('a partial refund keeps the unlock', async () => {
    const { sessionId, code } = await paidPurchase();
    await webhook(refunded(sessionId, false));
    expect((await row(sessionId))?.status).toBe('paid');
    expect(await check(code)).toBe(true);
    expect(await logFor(sessionId)).toContain('refund:partial_kept');
  });

  it('a dispute revokes the unlock and marks it disputed', async () => {
    const { sessionId, code } = await paidPurchase();
    await webhook(disputed(sessionId));
    expect((await row(sessionId))?.status).toBe('disputed');
    expect(await check(code)).toBe(false);
    expect(await logFor(sessionId)).toContain('dispute:revoked');
  });

  it('a dispute after a refund still ends disputed', async () => {
    const { sessionId } = await paidPurchase();
    await webhook(refunded(sessionId));
    await webhook(disputed(sessionId));
    expect((await row(sessionId))?.status).toBe('disputed');
  });

  it('an event from the other mode changes nothing', async () => {
    const sessionId = await startCheckout();
    fake.pay(sessionId);
    await webhook({ type: 'wrong_mode', eventId: eventId() });
    expect((await row(sessionId))?.status).toBe('pending');
  });
});

describe('purchase, for the page Stripe sends the buyer back to', () => {
  it('unlocks when the webhook is late, by asking Stripe', async () => {
    const sessionId = await startCheckout();
    expect(await purchase(sessionId)).toEqual({ status: 200, body: { paid: false, status: 'pending' } });

    fake.pay(sessionId);
    const { body } = await purchase(sessionId);
    expect(body).toEqual({ paid: true, code: formatCode(await unlockCodeFor(SECRET, sessionId)) });

    // A reload shows the same code. Stripe is not asked again.
    const calls = fake.verifyCalls;
    expect((await purchase(sessionId)).body.code).toBe(body.code);
    expect(fake.verifyCalls).toBe(calls);
  });

  it('refuses a session Stripe says is not paid (unpaid or expired)', async () => {
    const sessionId = await startCheckout();
    expect((await purchase(sessionId)).body.paid).toBe(false);
    expect((await row(sessionId))?.status).toBe('pending');
  });

  it('is 404 for an unknown or malformed session', async () => {
    expect((await purchase('cs_test_unknown00000001')).status).toBe(404);
    expect((await purchase('nope')).status).toBe(404);
  });
});

describe('unlock code check', () => {
  it('accepts the code of a paid purchase, typed loosely', async () => {
    const { code } = await paidPurchase();
    expect(await check(code)).toBe(true);
    expect(await check(formatCode(code))).toBe(true);
    expect(await check(encodeURIComponent(` ${formatCode(code).toLowerCase()} `))).toBe(true);
  });

  it('refuses unknown, unpaid and malformed codes', async () => {
    const sessionId = await startCheckout();
    expect(await check(await unlockCodeFor(SECRET, sessionId))).toBe(false);
    expect(await check('0000-0000-0000-0000')).toBe(false);
    expect(await check('short')).toBe(false);
    expect(await check('%E0%A4%A')).toBe(false);
  });

  it('a test purchase is refused by an app in live mode, and the reverse', async () => {
    const { code } = await paidPurchase();
    expect(await check(code, 'live')).toBe(false);

    const liveSession = await startCheckout();
    await db
      .prepare(`UPDATE purchases SET mode = 'live', status = 'paid', unlock_code_hash = ? WHERE stripe_session_id = ?`)
      .bind(await hashCode(await unlockCodeFor(SECRET, liveSession)), liveSession)
      .run();
    const liveCode = await unlockCodeFor(SECRET, liveSession);
    expect(await check(liveCode, 'live')).toBe(true);
    expect(await check(liveCode, 'test')).toBe(false);
    // A test deployment does not even confirm a live session.
    expect((await purchase(liveSession, 'test')).status).toBe(404);
  });

  it('a reissued code replaces the old one', async () => {
    const { sessionId, code } = await paidPurchase();
    const next = await unlockCodeFor(SECRET, sessionId, 1);
    await db
      .prepare('UPDATE purchases SET code_generation = 1, unlock_code_hash = ? WHERE stripe_session_id = ?')
      .bind(await hashCode(next), sessionId)
      .run();
    expect(await check(code)).toBe(false);
    expect(await check(next)).toBe(true);
    // The success page now shows the new code.
    expect((await purchase(sessionId)).body.code).toBe(formatCode(next));
  });
});
