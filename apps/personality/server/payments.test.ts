import type { PaymentsSettings } from '@micro/payments';
import { purchaseStore, type PaymentsContext } from '@micro/payments/server';
import { eventId, FakeProvider, webhookRequest } from '@micro/payments/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import catalog from '../config/products.json';
import p1 from '../src/data/items.p1.json';
import type { CompareResponse } from '../src/lib/compare.ts';
import type { Report } from '../src/lib/report.ts';
import { getCompare } from './compare.ts';
import { handleStripeWebhook } from '@micro/payments/server';
import { createCheckout, getReport } from './payments.ts';
import { createResult, getResult } from './results.ts';
import { createTestDb, type TestDb } from './testing.ts';

const ORIGIN = 'https://example.test';
const SETTINGS: PaymentsSettings = { enabled: true, mode: 'test', environment: 'local', passOrigin: '' };
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
  mode: string;
}

/** Stands in for Stripe. */
class FakePayments extends FakeProvider {
  /** The return addresses of every checkout started. */
  get urls() {
    return this.checkouts.map(({ successUrl, cancelUrl }) => ({ successUrl, cancelUrl }));
  }
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

function context(settings: Partial<PaymentsSettings> = {}): PaymentsContext {
  const full = { ...SETTINGS, ...settings };
  return {
    settings: full,
    store: purchaseStore({ db, app: 'personality', mode: full.mode }),
    provider: () => fake,
  };
}

/** A result that leans `toward` (1 to 5) the right poles: 4 gives INFP at 75%, 2 gives ESTJ at 75%. */
async function newResultId(toward = 4): Promise<string> {
  const answers = Object.fromEntries(
    p1.items.map((item) => [item.id, RIGHT_POLES.has(item.pole) ? toward : 6 - toward]),
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

function checkout(body: unknown, settings: Partial<PaymentsSettings> = {}): Promise<Response> {
  const request = new Request('http://127.0.0.1:8801/api/checkout', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return createCheckout(request, db, context(settings), ORIGIN);
}

/** Starts a checkout for the full report and returns its session id. */
async function startReportCheckout(resultId: string): Promise<string> {
  const response = await checkout({ product: 'report', resultId });
  expect(response.status).toBe(201);
  const { url } = (await response.json()) as { url: string };
  return url.replace('https://checkout.example/', '');
}

function webhook(sessionId: string | null, signature = 'good'): Promise<Response> {
  const event = sessionId
    ? ({ type: 'checkout.completed', eventId: eventId(), sessionId } as const)
    : ({ type: 'ignored', eventId: eventId(), stripeType: 'customer.created' } as const);
  return handleStripeWebhook(webhookRequest(event, signature), context());
}

function report(resultId: string, sessionId?: string): Promise<Response> {
  const query = sessionId ? `?session_id=${sessionId}` : '';
  const request = new Request(`http://localhost/api/results/${resultId}/report${query}`);
  return getReport(request, resultId, db, context());
}

async function purchases(resultId: string): Promise<PurchaseRow[]> {
  const { results } = await db
    .prepare('SELECT * FROM purchases WHERE result_id = ? ORDER BY created_at')
    .bind(resultId)
    .all<PurchaseRow>();
  return results;
}

async function isUnlocked(resultId: string): Promise<boolean> {
  const response = await getResult(resultId, db, 'test');
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
    fake.pay(sessionId);
    await webhook(sessionId);

    const response = await checkout({ product: 'report', resultId: id });
    expect(response.status).toBe(409);
    expect(((await response.json()) as ErrorBody).error).toBe('already_unlocked');
  });
});

describe('kill switch and mode', () => {
  it('closes checkout while the kill switch is off', async () => {
    const resultId = await newResultId();
    const response = await checkout({ product: 'report', resultId }, { ...SETTINGS, enabled: false });
    expect(response.status).toBe(503);
    expect(await purchases(resultId)).toEqual([]);
    expect((await checkout({ product: 'nope' }, { enabled: false })).status).toBe(503);
  });

  it('records the mode, and a purchase unlocks nothing in the other mode', async () => {
    const resultId = await newResultId();
    const sessionId = await startReportCheckout(resultId);
    expect((await purchases(resultId))[0]?.mode).toBe('test');
    fake.pay(sessionId);
    await webhook(sessionId);

    expect(await isUnlocked(resultId)).toBe(true);
    const live = await getResult(resultId, db, 'live');
    expect(((await live.json()) as { unlocked: boolean }).unlocked).toBe(false);
    const request = new Request(`http://localhost/api/results/${resultId}/report`);
    expect((await getReport(request, resultId, db, context({ mode: 'live' }))).status).toBe(402);
  });
});

describe('the all-app pass', () => {
  const yes = async () => true;

  it('an active pass unlocks every full report, and the server asks before sending text', async () => {
    const id = await newResultId();
    expect((await report(id)).status).toBe(402);
    const request = new Request(`http://localhost/api/results/${id}/report`);
    expect((await getReport(request, id, db, context(), yes)).status).toBe(200);
    const answer = (await (await getResult(id, db, 'test', yes)).json()) as { unlocked: boolean };
    expect(answer.unlocked).toBe(true);
    expect(await isUnlocked(id)).toBe(false);
  });

  it('an active pass unlocks the couple report and both full reports', async () => {
    const [a, b] = [await newResultId(4), await newResultId(2)];
    const request = new Request(`http://localhost/api/compare/${a}/${b}`);
    const body = (await (await getCompare(request, a, b, db, context(), yes)).json()) as CompareResponse;
    expect(body.unlocked).toBe(true);
    expect(body.couple).not.toBeNull();
    expect(body.a.reportUnlocked && body.b.reportUnlocked).toBe(true);
  });
});

describe('refunds and disputes', () => {
  it('a full refund locks the report again, a dispute locks the couple report', async () => {
    const id = await newResultId();
    const sessionId = await startReportCheckout(id);
    fake.pay(sessionId);
    await webhook(sessionId);
    expect(await isUnlocked(id)).toBe(true);

    const refund = { type: 'charge.refunded', eventId: eventId(), sessionId, paymentIntentId: null, full: true } as const;
    await handleStripeWebhook(webhookRequest(refund), context());
    expect(await isUnlocked(id)).toBe(false);
    expect((await report(id)).status).toBe(402);
    expect(await purchases(id)).toMatchObject([{ status: 'refunded' }]);
  });
});

describe('POST /api/stripe/webhook', () => {
  it('unlocks the report when Stripe says the session is paid', async () => {
    const id = await newResultId();
    const sessionId = await startReportCheckout(id);
    fake.pay(sessionId);

    expect((await webhook(sessionId)).status).toBe(200);
    expect(await purchases(id)).toMatchObject([{ status: 'paid' }]);
    expect(await isUnlocked(id)).toBe(true);
  });

  it('is safe to receive twice', async () => {
    const id = await newResultId();
    const sessionId = await startReportCheckout(id);
    fake.pay(sessionId);

    expect((await webhook(sessionId)).status).toBe(200);
    expect((await webhook(sessionId)).status).toBe(200);
    expect(await purchases(id)).toHaveLength(1);
    expect(await isUnlocked(id)).toBe(true);
  });

  it('rejects a bad signature and unlocks nothing', async () => {
    const id = await newResultId();
    const sessionId = await startReportCheckout(id);
    fake.pay(sessionId);

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
    fake.pay('cs_test_someoneelse1');
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
    fake.pay(sessionId);
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
    fake.pay(sessionId);

    const body = (await (await report(id, sessionId)).json()) as Report;
    expect(body.axes[0]?.balanceLabel).toBe('balanced, leans E');
    expect(body.axes[0]?.blocks.map((block) => block.heading)).toContain('Near the middle');
  });

  it('unlocks from the session id when the webhook has not arrived', async () => {
    const id = await newResultId();
    const sessionId = await startReportCheckout(id);

    expect((await report(id, sessionId)).status).toBe(402);
    fake.pay(sessionId);
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
    fake.pay(sessionId);

    expect((await report(other, sessionId)).status).toBe(402);
    expect(await isUnlocked(other)).toBe(false);
  });

  it('does not ask Stripe about a session id it never created', async () => {
    const id = await newResultId();
    fake.pay('cs_test_someoneelse1');
    expect((await report(id, 'cs_test_someoneelse1')).status).toBe(402);
    expect((await report(id, 'not a session')).status).toBe(402);
    expect(fake.verifyCalls).toBe(0);
  });
});

function compare(a: string, b: string, sessionId?: string): Promise<Response> {
  const query = sessionId ? `?session_id=${sessionId}` : '';
  const request = new Request(`http://localhost/api/compare/${a}/${b}${query}`);
  return getCompare(request, a, b, db, context());
}

/** Starts a checkout for a pair and returns its session id. */
async function startPairCheckout(product: string, resultId: string, partnerResultId: string): Promise<string> {
  const response = await checkout({ product, resultId, partnerResultId });
  expect(response.status).toBe(201);
  const { url } = (await response.json()) as { url: string };
  return url.replace('https://checkout.example/', '');
}

describe('GET /api/compare/:a/:b', () => {
  it('compares two results for free, without the couple report text', async () => {
    const a = await newResultId(4);
    const b = await newResultId(2);
    const response = await compare(a, b);

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    const text = await response.text();
    expect(text).not.toContain('Questions to talk through');
    expect(text).not.toContain('gains energy');
    const body = JSON.parse(text) as CompareResponse;
    expect(body.a).toEqual({ id: a, type: 'INFP', reportUnlocked: false });
    expect(body.b).toEqual({ id: b, type: 'ESTJ', reportUnlocked: false });
    expect(body.axes.map((axis) => [axis.axis, axis.alike, axis.difference])).toEqual([
      ['EI', false, 50],
      ['SN', false, 50],
      ['TF', false, 50],
      ['JP', false, 50],
    ]);
    expect(body.similarity).toBe(50);
    expect(body.unlocked).toBe(false);
    expect(body.couple).toBeNull();
  });

  it('rejects the same result twice and unknown results', async () => {
    const a = await newResultId();
    const same = await compare(a, a);
    expect(same.status).toBe(400);
    expect(((await same.json()) as ErrorBody).error).toBe('same_result');
    expect((await compare(a, 'abcdefghjkmnpqrs')).status).toBe(404);
    expect((await compare('abcdefghjkmnpqrs', a)).status).toBe(404);
  });

  it('returns the couple report once the pair is paid, from either side', async () => {
    const a = await newResultId(4);
    const b = await newResultId(4);
    const sessionId = await startPairCheckout('couple', a, b);
    expect(fake.urls.at(-1)?.successUrl).toBe(
      `${ORIGIN}/personality/c/${a}/${b}?session_id={CHECKOUT_SESSION_ID}`,
    );
    fake.pay(sessionId);
    await webhook(sessionId);

    for (const [first, second] of [
      [a, b],
      [b, a],
    ] as const) {
      const body = (await (await compare(first, second)).json()) as CompareResponse;
      expect(body.unlocked).toBe(true);
      expect(body.couple?.map((section) => section.heading)).toEqual(['Both I', 'Both N', 'Both F', 'Both P']);
      expect(body.couple?.[0]?.title).toBe('Extraversion and Introversion, together');
      expect(body.couple?.[0]?.body).toContain('You both lean toward quiet');
      expect(body.couple?.[0]?.questions).toHaveLength(4);
    }
    // The couple report does not unlock either full report.
    expect(await isUnlocked(a)).toBe(false);
    expect(await isUnlocked(b)).toBe(false);
  });

  it('uses the "one of each" text where the two differ', async () => {
    const a = await newResultId(4);
    const b = await newResultId(2);
    const sessionId = await startPairCheckout('couple', a, b);
    fake.pay(sessionId);

    const body = (await (await compare(b, a, sessionId)).json()) as CompareResponse;
    expect(body.unlocked).toBe(true);
    expect(body.couple?.map((section) => section.heading)).toEqual([
      'One E, one I',
      'One S, one N',
      'One T, one F',
      'One J, one P',
    ]);
  });

  it('"both" unlocks the couple report and the buyer\'s full report, not the partner\'s', async () => {
    const mine = await newResultId(4);
    const theirs = await newResultId(2);
    const sessionId = await startPairCheckout('both', mine, theirs);
    fake.pay(sessionId);
    await webhook(sessionId);

    const body = (await (await compare(mine, theirs)).json()) as CompareResponse;
    expect(body.unlocked).toBe(true);
    expect(body.a.reportUnlocked).toBe(true);
    expect(body.b.reportUnlocked).toBe(false);
    expect((await report(mine)).status).toBe(200);
    expect((await report(theirs)).status).toBe(402);
  });

  it('does not unlock from a session that paid for another pair', async () => {
    const a = await newResultId();
    const b = await newResultId();
    const c = await newResultId();
    const sessionId = await startPairCheckout('couple', a, b);
    fake.pay(sessionId);

    expect(((await (await compare(a, c, sessionId)).json()) as CompareResponse).unlocked).toBe(false);
    expect(((await (await compare(a, b)).json()) as CompareResponse).unlocked).toBe(false);
    expect(((await (await compare(a, b, sessionId)).json()) as CompareResponse).unlocked).toBe(true);
  });

  it('refuses to sell a couple report that is already unlocked', async () => {
    const a = await newResultId();
    const b = await newResultId();
    const sessionId = await startPairCheckout('couple', a, b);
    fake.pay(sessionId);
    await webhook(sessionId);

    const again = await checkout({ product: 'couple', resultId: b, partnerResultId: a });
    expect(again.status).toBe(409);
    // "both" is still for sale, because the full report is not unlocked yet.
    expect((await checkout({ product: 'both', resultId: a, partnerResultId: b })).status).toBe(201);
  });
});

describe('GET /api/results/:id', () => {
  it('now returns the free summary for the type', async () => {
    const id = await newResultId();
    const body = (await (await getResult(id, db, 'test')).json()) as { summary: string | null };
    expect(body.summary).toContain('You prefer quiet, ideas and possibilities');
  });
});
