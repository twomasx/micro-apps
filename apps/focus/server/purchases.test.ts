import type { PaymentsProvider } from '@micro/payments';
import { formatCode, hashCode, normalizeCode, unlockCodeFor } from '@micro/payments/unlock-codes';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import catalog from '../config/products.json';
import {
  checkUnlockCode,
  createCheckout,
  getPurchase,
  handleStripeWebhook,
  type CheckoutUrls,
  type PaymentsFactory,
} from './purchases.ts';
import { createTestDb, type TestDb } from './testing.ts';

const ORIGIN = 'https://example.test';
const SECRET = 'test-secret-that-is-long-enough-0123456789';

interface PurchaseRow {
  stripe_session_id: string;
  unlock_code_hash: string | null;
  amount_cents: number;
  currency: string;
  status: string;
}

// The database lasts for the whole file, so session ids must never repeat.
let nextSession = 1;

/** Stands in for Stripe. `paidSessions` is what Stripe would say has been paid. */
class FakePayments {
  paidSessions = new Set<string>();
  urls: CheckoutUrls[] = [];
  verifyCalls = 0;

  factory: PaymentsFactory = (urls) => {
    const provider: PaymentsProvider = {
      createCheckout: async () => {
        this.urls.push(urls);
        const sessionId = `cs_test_focus${String(nextSession++).padStart(8, '0')}`;
        return { sessionId, url: `https://checkout.example/${sessionId}` };
      },
      verifyPurchase: async (sessionId) => {
        this.verifyCalls += 1;
        return { paid: this.paidSessions.has(sessionId), productId: 'lifetime' };
      },
      handleWebhook: async (request) => {
        if (request.headers.get('stripe-signature') !== 'good') throw new Error('bad signature');
        const body = (await request.json()) as { sessionId?: string };
        return body.sessionId
          ? { type: 'purchase.completed', sessionId: body.sessionId, productId: 'lifetime' }
          : { type: 'ignored' };
      },
    };
    return provider;
  };
}

let testDb: TestDb;
let db: D1Database;
let fake: FakePayments;

beforeAll(async () => {
  testDb = await createTestDb();
  db = testDb.db;
});

afterAll(async () => {
  await testDb.dispose();
});

beforeEach(() => {
  fake = new FakePayments();
});

function checkout(body: unknown): Promise<Response> {
  const request = new Request('http://127.0.0.1:8802/api/checkout', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  return createCheckout(request, db, fake.factory, ORIGIN);
}

async function startCheckout(): Promise<string> {
  const response = await checkout({ product: 'lifetime' });
  expect(response.status).toBe(201);
  const { url } = (await response.json()) as { url: string };
  return url.replace('https://checkout.example/', '');
}

function webhook(sessionId: string | null, signature = 'good'): Promise<Response> {
  const request = new Request('http://localhost/api/stripe/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': signature },
    body: JSON.stringify(sessionId ? { sessionId } : {}),
  });
  return handleStripeWebhook(request, db, fake.factory, SECRET);
}

async function purchase(sessionId: string) {
  const response = await getPurchase(sessionId, db, fake.factory, SECRET);
  return { status: response.status, body: (await response.json()) as { paid?: boolean; code?: string } };
}

async function check(code: string): Promise<boolean> {
  const response = await checkUnlockCode(code, db);
  return ((await response.json()) as { valid: boolean }).valid;
}

function row(sessionId: string): Promise<PurchaseRow | null> {
  return db.prepare('SELECT * FROM purchases WHERE stripe_session_id = ?').bind(sessionId).first<PurchaseRow>();
}

describe('unlock codes', () => {
  it('are 16 characters, the same for the same session, different between sessions', async () => {
    const a = await unlockCodeFor(SECRET, 'cs_test_a');
    expect(a).toMatch(/^[0-9A-HJKMNP-TV-Z]{16}$/);
    expect(await unlockCodeFor(SECRET, 'cs_test_a')).toBe(a);
    expect(await unlockCodeFor(SECRET, 'cs_test_b')).not.toBe(a);
    expect(await unlockCodeFor(`${SECRET}x`, 'cs_test_a')).not.toBe(a);
  });

  it('refuses a short secret', async () => {
    await expect(unlockCodeFor('short', 'cs_test_a')).rejects.toThrow();
  });
});

describe('checkout', () => {
  it('starts a Stripe checkout for the lifetime unlock and records it as pending', async () => {
    const sessionId = await startCheckout();
    expect(fake.urls[0]).toEqual({
      successUrl: `${ORIGIN}/focus/unlock?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${ORIGIN}/focus/unlock`,
    });
    const product = catalog.products.find((p) => p.id === 'lifetime');
    expect(await row(sessionId)).toMatchObject({
      unlock_code_hash: null,
      amount_cents: product?.amount,
      currency: product?.currency,
      status: 'pending',
    });
  });

  it('refuses other products and bad bodies', async () => {
    expect((await checkout({ product: 'report' })).status).toBe(400);
    expect((await checkout({})).status).toBe(400);
    expect((await checkout('not json')).status).toBe(400);
    expect((await checkout({ product: 'lifetime', pad: 'x'.repeat(2000) })).status).toBe(413);
  });
});

describe('webhook', () => {
  it('rejects a bad signature', async () => {
    expect((await webhook('cs_test_x', 'bad')).status).toBe(400);
  });

  it('marks a paid purchase and stores only the hash of its code', async () => {
    const sessionId = await startCheckout();
    fake.paidSessions.add(sessionId);
    expect((await webhook(sessionId)).status).toBe(200);

    const code = await unlockCodeFor(SECRET, sessionId);
    const saved = await row(sessionId);
    expect(saved?.status).toBe('paid');
    expect(saved?.unlock_code_hash).toBe(await hashCode(code));
    expect(JSON.stringify(saved)).not.toContain(code);
  });

  it('is safe to receive twice', async () => {
    const sessionId = await startCheckout();
    fake.paidSessions.add(sessionId);
    await webhook(sessionId);
    const first = await row(sessionId);
    expect((await webhook(sessionId)).status).toBe(200);
    expect(await row(sessionId)).toEqual(first);
    expect(fake.verifyCalls).toBe(1);
  });

  it('leaves an unpaid checkout pending', async () => {
    const sessionId = await startCheckout();
    await webhook(sessionId);
    expect((await row(sessionId))?.status).toBe('pending');
  });

  it('ignores sessions this app did not create, without asking Stripe', async () => {
    expect((await webhook('cs_test_someoneelse0001')).status).toBe(200);
    expect(fake.verifyCalls).toBe(0);
    expect(await row('cs_test_someoneelse0001')).toBeNull();
  });
});

describe('purchase for the success page', () => {
  it('says not paid yet, then returns the code once Stripe says paid, even before the webhook', async () => {
    const sessionId = await startCheckout();
    expect(await purchase(sessionId)).toEqual({ status: 200, body: { paid: false } });

    fake.paidSessions.add(sessionId);
    const { body } = await purchase(sessionId);
    expect(body.paid).toBe(true);
    expect(body.code).toBe(formatCode(await unlockCodeFor(SECRET, sessionId)));
    expect(body.code).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);

    // A reload shows the same code. Stripe is not asked again.
    const calls = fake.verifyCalls;
    expect((await purchase(sessionId)).body.code).toBe(body.code);
    expect(fake.verifyCalls).toBe(calls);
  });

  it('is 404 for an unknown or malformed session', async () => {
    expect((await purchase('cs_test_unknown00000001')).status).toBe(404);
    expect((await purchase('nope')).status).toBe(404);
  });
});

describe('unlock code check', () => {
  it('accepts the code of a paid purchase, typed loosely', async () => {
    const sessionId = await startCheckout();
    fake.paidSessions.add(sessionId);
    await webhook(sessionId);
    const code = await unlockCodeFor(SECRET, sessionId);

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
});

describe('normalizeCode', () => {
  it('reads look-alike letters as digits and drops spaces and dashes', () => {
    expect(normalizeCode('abcd-efgh-jkmn-pqrs')).toBe('ABCDEFGHJKMNPQRS');
    expect(normalizeCode('O0Il 1111 2222 3333')).toBe('0011111122223333');
    expect(normalizeCode('ABCD-EFGH-JKMN-PQRU')).toBeNull();
    expect(normalizeCode('ABCD')).toBeNull();
  });
});
