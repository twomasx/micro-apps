import type { PaymentsProvider } from '@micro/payments';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import catalog from '../config/products.json';
import p1 from '../src/data/items.p1.json';
import type { Report } from '../src/lib/report.ts';
import {
  createCheckout,
  getReport,
  handleStripeWebhook,
  type CheckoutUrls,
  type PaymentsFactory,
} from './payments.ts';
import { createResult, getResult } from './results.ts';
import { createTestDb, type TestDb } from './testing.ts';

const ORIGIN = 'https://example.test';
const RIGHT_POLES = new Set(p1.axes.map((axis) => axis.right.letter));

interface ErrorBody {
  error: string;
}

interface PurchaseRow {
  product: string;
  result_id: string;
  partner_result_id: string | null;
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
        const sessionId = `cs_test_fake${String(nextSession++).padStart(8, '0')}`;
        return { sessionId, url: `https://checkout.example/${sessionId}` };
      },
      verifyPurchase: async (sessionId) => {
        this.verifyCalls += 1;
        return { paid: this.paidSessions.has(sessionId), productId: null };
      },
      handleWebhook: async (request) => {
        if (request.headers.get('stripe-signature') !== 'good') throw new Error('bad signature');
        const body = (await request.json()) as { sessionId?: string };
        return body.sessionId
          ? { type: 'purchase.completed', sessionId: body.sessionId, productId: null }
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

async function newResultId(): Promise<string> {
  const answers = Object.fromEntries(
    p1.items.map((item) => [item.id, RIGHT_POLES.has(item.pole) ? 4 : 2]),
  );
  const response = await createResult(
    new Request('http://localhost/api/results', {
      method: 'POST',
      body: JSON.stringify({ version: 'p1', answers }),
    }),
    db,
  );
  return ((await response.json()) as { id: string }).id;
}

function checkout(body: unknown): Promise<Response> {
  const request = new Request('http://127.0.0.1:8801/api/checkout', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return createCheckout(request, db, fake.factory, ORIGIN);
}

/** Starts a checkout for the full report and returns its session id. */
async function startReportCheckout(resultId: string): Promise<string> {
  const response = await checkout({ product: 'report', resultId });
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
  return handleStripeWebhook(request, db, fake.factory);
}

function report(resultId: string, sessionId?: string): Promise<Response> {
  const query = sessionId ? `?session_id=${sessionId}` : '';
  const request = new Request(`http://localhost/api/results/${resultId}/report${query}`);
  return getReport(request, resultId, db, fake.factory);
}

async function purchases(resultId: string): Promise<PurchaseRow[]> {
  const { results } = await db
    .prepare('SELECT * FROM purchases WHERE result_id = ? ORDER BY created_at')
    .bind(resultId)
    .all<PurchaseRow>();
  return results;
}

async function isUnlocked(resultId: string): Promise<boolean> {
  const response = await getResult(resultId, db);
  return ((await response.json()) as { unlocked: boolean }).unlocked;
}

describe('products', () => {
  it('are the three one-time unlocks at the agreed prices', () => {
    expect(catalog.products.map(({ id, amount, currency }) => [id, amount, currency])).toEqual([
      ['report', 999, 'usd'],
      ['couple', 799, 'usd'],
      ['both', 1499, 'usd'],
    ]);
  });
});

describe('POST /api/checkout', () => {
  it('returns the checkout URL and stores a pending purchase', async () => {
    const id = await newResultId();
    const response = await checkout({ product: 'report', resultId: id });

    expect(response.status).toBe(201);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(((await response.json()) as { url: string }).url).toMatch(/^https:\/\/checkout\.example\/cs_test_/);
    expect(await purchases(id)).toMatchObject([
      { product: 'report', partner_result_id: null, amount_cents: 999, currency: 'usd', status: 'pending' },
    ]);
    expect(await isUnlocked(id)).toBe(false);
  });

  it('sends the buyer back to the report on the public origin', async () => {
    const id = await newResultId();
    await checkout({ product: 'report', resultId: id });
    expect(fake.urls).toEqual([
      {
        successUrl: `${ORIGIN}/personality/r/${id}/report?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${ORIGIN}/personality/r/${id}/report`,
      },
    ]);
  });

  it('rejects a bad body, an unknown product and an unknown result', async () => {
    const id = await newResultId();
    const cases: [unknown, number, string][] = [
      [{ resultId: id }, 400, 'invalid_body'],
      [{ product: 'placeholder', resultId: id }, 400, 'unknown_product'],
      [{ product: 'report', resultId: 'abcdefghjkmnpqrs' }, 404, 'not_found'],
    ];
    for (const [body, status, code] of cases) {
      const response = await checkout(body);
      expect(response.status).toBe(status);
      expect(((await response.json()) as ErrorBody).error).toBe(code);
    }
    expect(await purchases(id)).toEqual([]);
  });

  it('needs a second, different result for the couple report and for both', async () => {
    const id = await newResultId();
    const partner = await newResultId();
    for (const product of ['couple', 'both']) {
      for (const partnerResultId of [undefined, id]) {
        const response = await checkout({ product, resultId: id, partnerResultId });
        expect(response.status).toBe(400);
        expect(((await response.json()) as ErrorBody).error).toBe('partner_required');
      }
    }
    expect((await checkout({ product: 'couple', resultId: id, partnerResultId: 'abcdefghjkmnpqrs' })).status).toBe(404);

    expect((await checkout({ product: 'both', resultId: id, partnerResultId: partner })).status).toBe(201);
    expect(await purchases(id)).toMatchObject([
      { product: 'both', partner_result_id: partner, amount_cents: 1499, status: 'pending' },
    ]);
  });

  it('refuses to sell a report that is already unlocked', async () => {
    const id = await newResultId();
    const sessionId = await startReportCheckout(id);
    fake.paidSessions.add(sessionId);
    await webhook(sessionId);

    const response = await checkout({ product: 'report', resultId: id });
    expect(response.status).toBe(409);
    expect(((await response.json()) as ErrorBody).error).toBe('already_unlocked');
  });
});

describe('POST /api/stripe/webhook', () => {
  it('unlocks the report when Stripe says the session is paid', async () => {
    const id = await newResultId();
    const sessionId = await startReportCheckout(id);
    fake.paidSessions.add(sessionId);

    expect((await webhook(sessionId)).status).toBe(200);
    expect(await purchases(id)).toMatchObject([{ status: 'paid' }]);
    expect(await isUnlocked(id)).toBe(true);
  });

  it('is safe to receive twice', async () => {
    const id = await newResultId();
    const sessionId = await startReportCheckout(id);
    fake.paidSessions.add(sessionId);

    expect((await webhook(sessionId)).status).toBe(200);
    expect((await webhook(sessionId)).status).toBe(200);
    expect(await purchases(id)).toHaveLength(1);
    expect(await isUnlocked(id)).toBe(true);
  });

  it('rejects a bad signature and unlocks nothing', async () => {
    const id = await newResultId();
    const sessionId = await startReportCheckout(id);
    fake.paidSessions.add(sessionId);

    const response = await webhook(sessionId, 'forged');
    expect(response.status).toBe(400);
    expect(((await response.json()) as ErrorBody).error).toBe('invalid_signature');
    expect(await isUnlocked(id)).toBe(false);
  });

  it('does not unlock a completed checkout that is not paid yet', async () => {
    const id = await newResultId();
    const sessionId = await startReportCheckout(id);
    expect((await webhook(sessionId)).status).toBe(200);
    expect(await isUnlocked(id)).toBe(false);
  });

  it('accepts events it does not use and sessions it never created', async () => {
    expect((await webhook(null)).status).toBe(200);
    fake.paidSessions.add('cs_test_someoneelse1');
    expect((await webhook('cs_test_someoneelse1')).status).toBe(200);
  });
});

describe('GET /api/results/:id/report', () => {
  it('is 402 until paid and never leaks the report text', async () => {
    const id = await newResultId();
    const response = await report(id);
    expect(response.status).toBe(402);
    const text = await response.text();
    expect(JSON.parse(text)).toMatchObject({ error: 'payment_required' });
    expect(text).not.toContain('Strengths');
  });

  it('is 404 for an unknown result', async () => {
    expect((await report('abcdefghjkmnpqrs')).status).toBe(404);
  });

  it('returns the full report after the webhook', async () => {
    const id = await newResultId();
    const sessionId = await startReportCheckout(id);
    fake.paidSessions.add(sessionId);
    await webhook(sessionId);

    const response = await report(id);
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    const body = (await response.json()) as Report;
    // Every answer leaned 75% toward the right pole.
    expect(body.type).toBe('INFP');
    expect(body.summary).toContain('You prefer quiet');
    expect(body.axes.map((axis) => axis.headline)).toEqual([
      '75% Introversion',
      '75% Intuition',
      '75% Feeling',
      '75% Perceiving',
    ]);
    expect(body.axes[0]?.title).toBe('Extraversion and Introversion');
    // The numbers the report's graphics are drawn from.
    expect(body.axes[0]).toMatchObject({
      letter: 'I',
      rightPct: 75,
      itemCount: 10,
      left: { letter: 'E', name: 'Extraversion', pct: 25, winner: false },
      right: { letter: 'I', name: 'Introversion', pct: 75, winner: true },
    });
    expect(body.traits).toEqual([
      { axis: 'EI', trait: 'Extraversion', pct: 25 },
      { axis: 'SN', trait: 'Openness to experience', pct: 75 },
      { axis: 'TF', trait: 'Agreeableness', pct: 75 },
      { axis: 'JP', trait: 'Conscientiousness', pct: 25 },
    ]);
    expect(body).toMatchObject({ version: 'p1', questionCount: 40 });
    expect(Number.isNaN(Date.parse(body.createdAt))).toBe(false);
    expect(body.axes[0]?.blocks.map((block) => block.heading)).toEqual([
      'What this scale measures',
      'Your result',
      'As a Big Five trait',
    ]);
    expect(body.axes[0]?.blocks[1]?.body).toContain('leaned toward Introversion');
    expect(body.sections.map((section) => section.heading)).toEqual([
      'Strengths',
      'Blind spots',
      'At work',
      'Under stress',
      'How others may read you',
    ]);
  });

  it('adds the middle section for a balanced axis', async () => {
    const answers = Object.fromEntries(p1.items.map((item) => [item.id, 3]));
    const created = await createResult(
      new Request('http://localhost/api/results', {
        method: 'POST',
        body: JSON.stringify({ version: 'p1', answers }),
      }),
      db,
    );
    const { id } = (await created.json()) as { id: string };
    const sessionId = await startReportCheckout(id);
    fake.paidSessions.add(sessionId);

    const body = (await (await report(id, sessionId)).json()) as Report;
    expect(body.axes[0]?.balanceLabel).toBe('balanced, leans E');
    expect(body.axes[0]?.blocks.map((block) => block.heading)).toContain('Near the middle');
  });

  it('unlocks from the session id when the webhook has not arrived', async () => {
    const id = await newResultId();
    const sessionId = await startReportCheckout(id);

    expect((await report(id, sessionId)).status).toBe(402);
    fake.paidSessions.add(sessionId);
    expect((await report(id, sessionId)).status).toBe(200);
    expect(await purchases(id)).toMatchObject([{ status: 'paid' }]);

    // Once unlocked, Stripe is not asked again.
    const calls = fake.verifyCalls;
    expect((await report(id)).status).toBe(200);
    expect(fake.verifyCalls).toBe(calls);
  });

  it('does not unlock from a session that paid for a different result', async () => {
    const paidFor = await newResultId();
    const other = await newResultId();
    const sessionId = await startReportCheckout(paidFor);
    fake.paidSessions.add(sessionId);

    expect((await report(other, sessionId)).status).toBe(402);
    expect(await isUnlocked(other)).toBe(false);
  });

  it('does not ask Stripe about a session id it never created', async () => {
    const id = await newResultId();
    fake.paidSessions.add('cs_test_someoneelse1');
    expect((await report(id, 'cs_test_someoneelse1')).status).toBe(402);
    expect((await report(id, 'not a session')).status).toBe(402);
    expect(fake.verifyCalls).toBe(0);
  });
});

describe('GET /api/results/:id', () => {
  it('now returns the free summary for the type', async () => {
    const id = await newResultId();
    const body = (await (await getResult(id, db)).json()) as { summary: string | null };
    expect(body.summary).toContain('You prefer quiet, ideas and possibilities');
  });
});
