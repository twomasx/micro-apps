import type { PaymentsSettings } from '@micro/payments';
import { requestHasUnlock, UNLOCK_HEADER } from '@micro/payments/server';
import { eventId, FakeProvider, webhookRequest } from '@micro/payments/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import catalog from '../config/products.json';
import b1 from '../src/data/items.b1.json';
import p1 from '../src/data/items.p1.json';
import type { BigFiveCompareResponse, BigFiveReport, BigFiveResultResponse } from '../src/lib/big-five-view.ts';
import type { CompareResponse } from '../src/lib/compare.ts';
import type { Report } from '../src/lib/report.ts';
import { getCompare } from './compare.ts';
import { LOCKED, purchases, type HasUnlock } from './payments.ts';
import { createResult, getReport, getResult } from './results.ts';
import { createTestDb, type TestDb } from './testing.ts';
import { purchaseStore, type PaymentsContext } from '@micro/payments/server';

const ORIGIN = 'https://example.test';
const SECRET = 'personality-test-secret-0123456789abcdef';
const SETTINGS: PaymentsSettings = { enabled: true, mode: 'test', environment: 'local', passOrigin: '' };
const RIGHT_POLES = new Set(p1.axes.map((axis) => axis.right.letter));
const DEVICE = 'abcdefghijkm23456789';

let testDb: TestDb;
let db: D1Database;
let fake: FakeProvider;

beforeAll(async () => {
  testDb = await createTestDb();
  db = testDb.db;
});

afterAll(async () => {
  await testDb.dispose();
});

beforeEach(() => {
  fake = new FakeProvider();
});

function context(settings: Partial<PaymentsSettings> = {}): PaymentsContext {
  const full = { ...SETTINGS, ...settings };
  return {
    settings: full,
    store: purchaseStore({ db, app: 'personality', mode: full.mode, codeSecret: SECRET }),
    provider: () => fake,
  };
}

async function create(version: string, answers: Record<string, number>): Promise<string> {
  const response = await createResult(
    new Request('http://localhost/api/results', { method: 'POST', body: JSON.stringify({ version, answers }) }),
    db,
  );
  expect(response.status).toBe(201);
  return ((await response.json()) as { id: string }).id;
}

/** A four-letter result that leans `toward` (1 to 5) the right poles: 4 gives INFP at 75%, 2 gives ESTJ at 75%. */
function typeResult(toward = 4): Promise<string> {
  return create('p1', Object.fromEntries(p1.items.map((item) => [item.id, RIGHT_POLES.has(item.pole) ? toward : 6 - toward])));
}

/** A Big Five result: `value` on high-keyed questions and the mirror on reverse-keyed ones. 4 gives 75 everywhere. */
function bigFiveResult(value = 4): Promise<string> {
  return create('b1', Object.fromEntries(b1.items.map((item) => [item.id, item.keyed === '+' ? value : 6 - value])));
}

/** Buys the lifetime unlock through the fake Stripe and the webhook. Returns the code the buyer is shown. */
async function buy(settings: Partial<PaymentsSettings> = {}): Promise<{ sessionId: string; code: string }> {
  const ctx = context(settings);
  const response = await purchases.checkout(
    new Request('http://127.0.0.1:8801/api/checkout', { method: 'POST', body: JSON.stringify({ product: 'lifetime' }) }),
    ctx,
    ORIGIN,
  );
  expect(response.status).toBe(201);
  const sessionId = ((await response.json()) as { url: string }).url.replace('https://checkout.example/', '');
  fake.pay(sessionId);
  const webhook = await purchases.webhook(webhookRequest({ type: 'checkout.completed', eventId: eventId(), sessionId }), ctx);
  expect(webhook.status).toBe(200);
  const answer = (await (await purchases.purchase(sessionId, ctx)).json()) as { paid: boolean; code: string };
  expect(answer.paid).toBe(true);
  return { sessionId, code: answer.code };
}

/** What the functions do for a request: check the headers it carries against this database. */
function unlockFor(headers: Record<string, string>, mode: 'test' | 'live' = 'test'): HasUnlock {
  return () => requestHasUnlock(new Request('http://localhost/api/x', { headers }), { db, app: 'personality', mode });
}

const withCode = (code: string) => unlockFor({ [UNLOCK_HEADER]: code, 'X-Device-Id': DEVICE });

describe('the product', () => {
  it('is one lifetime unlock at $9.99', () => {
    expect(catalog.products).toEqual([{ id: 'lifetime', name: 'Personality lifetime unlock', amount: 999, currency: 'usd' }]);
  });

  it('checkout sends the buyer back to the unlock page and stores a pending purchase tied to no result', async () => {
    const response = await purchases.checkout(
      new Request('http://127.0.0.1:8801/api/checkout', { method: 'POST', body: JSON.stringify({ product: 'lifetime' }) }),
      context(),
      ORIGIN,
    );
    expect(response.status).toBe(201);
    expect(fake.checkouts.at(-1)).toMatchObject({
      successUrl: `${ORIGIN}/personality/unlock?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${ORIGIN}/personality/unlock`,
    });
    const sessionId = ((await response.json()) as { url: string }).url.replace('https://checkout.example/', '');
    const row = await db.prepare('SELECT * FROM purchases WHERE stripe_session_id = ?').bind(sessionId).first();
    expect(row).toMatchObject({ product: 'lifetime', result_id: null, amount_cents: 999, status: 'pending', mode: 'test' });
  });

  it('the old per-result products are no longer sold', async () => {
    const response = await purchases.checkout(
      new Request('http://127.0.0.1:8801/api/checkout', { method: 'POST', body: JSON.stringify({ product: 'report', resultId: 'x' }) }),
      context(),
      ORIGIN,
    );
    expect(response.status).toBe(400);
  });

  it('checkout is closed while the kill switch is off', async () => {
    const response = await purchases.checkout(
      new Request('http://127.0.0.1:8801/api/checkout', { method: 'POST', body: JSON.stringify({ product: 'lifetime' }) }),
      context({ enabled: false }),
      ORIGIN,
    );
    expect(response.status).toBe(503);
  });
});

describe('one unlock opens everything', () => {
  it('a paid code opens every full report and every couple report, of both tests', async () => {
    const { code } = await buy();
    const [mine, theirs, five, otherFive] = await Promise.all([typeResult(4), typeResult(2), bigFiveResult(4), bigFiveResult(2)]);
    for (const id of [mine, theirs, five, otherFive]) {
      expect((await getReport(id, db, withCode(code))).status).toBe(200);
    }
    expect(((await (await getCompare(mine, theirs, db, withCode(code))).json()) as CompareResponse).couple).not.toBeNull();
    expect(((await (await getCompare(five, otherFive, db, withCode(code))).json()) as BigFiveCompareResponse).couple).not.toBeNull();
  });

  it('without it the report is 402 and the text never leaks', async () => {
    const id = await typeResult();
    const response = await getReport(id, db, LOCKED);
    expect(response.status).toBe(402);
    const text = await response.text();
    expect(text).not.toContain('Strengths');
    expect(JSON.parse(text)).toMatchObject({ error: 'payment_required' });
    expect((await getReport('abcdefghjkmnpqrs', db, LOCKED)).status).toBe(404);
  });

  it('the result says whether this device may read the report', async () => {
    const { code } = await buy();
    const id = await typeResult();
    const read = async (hasUnlock: HasUnlock) => ((await (await getResult(id, db, hasUnlock)).json()) as { unlocked: boolean }).unlocked;
    expect(await read(LOCKED)).toBe(false);
    expect(await read(withCode(code))).toBe(true);
    expect(await read(unlockFor({ [UNLOCK_HEADER]: code }))).toBe(false);
  });

  it('a refund or dispute locks everything again', async () => {
    const { code, sessionId } = await buy();
    const id = await typeResult();
    expect((await getReport(id, db, withCode(code))).status).toBe(200);
    await purchaseStore({ db, app: 'personality', mode: 'test' }).revoke(sessionId, 'refunded');
    expect((await getReport(id, db, withCode(code))).status).toBe(402);
  });

  it('a purchase made in one mode unlocks nothing in the other', async () => {
    const { code } = await buy();
    const id = await typeResult();
    expect((await getReport(id, db, unlockFor({ [UNLOCK_HEADER]: code, 'X-Device-Id': DEVICE }, 'live'))).status).toBe(402);
  });

  it('an all-app pass opens it too, asked of the pass service', async () => {
    const id = await bigFiveResult();
    const fetcher = vi.fn(async () => Response.json({ valid: true, status: 'active' })) as unknown as typeof fetch;
    const hasUnlock: HasUnlock = () =>
      requestHasUnlock(new Request('http://localhost/api/x', { headers: { 'X-Pass-Code': 'K7QM-XRP2-9VTD-4HNC', 'X-Device-Id': DEVICE } }), {
        db,
        app: 'personality',
        mode: 'test',
        pass: { passOrigin: 'https://pass.example', serviceKey: 'k', app: 'personality', fetcher },
      });
    expect((await getReport(id, db, hasUnlock)).status).toBe(200);
  });
});

describe('the four-letter report', () => {
  it('is the full report for the result', async () => {
    const { code } = await buy();
    const id = await typeResult();
    const response = await getReport(id, db, withCode(code));
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    const body = (await response.json()) as Report & { kind: string };
    expect(body.kind).toBe('type');
    // Every answer leaned 75% toward the right pole.
    expect(body.type).toBe('INFP');
    expect(body.summary).toContain('You prefer quiet');
    expect(body.axes.map((axis) => axis.headline)).toEqual(['75% Introversion', '75% Intuition', '75% Feeling', '75% Perceiving']);
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
    expect(body.axes[0]?.blocks.map((block) => block.heading)).toEqual(['What this scale measures', 'Your result', 'As a Big Five trait']);
    expect(body.sections.map((section) => section.heading)).toEqual([
      'Strengths',
      'Blind spots',
      'At work',
      'Under stress',
      'How others may read you',
    ]);
  });

  it('adds the middle section for a balanced axis', async () => {
    const { code } = await buy();
    const id = await create('p1', Object.fromEntries(p1.items.map((item) => [item.id, 3])));
    const body = (await (await getReport(id, db, withCode(code))).json()) as Report;
    expect(body.axes[0]?.balanceLabel).toBe('balanced, leans E');
    expect(body.axes[0]?.blocks.map((block) => block.heading)).toContain('Near the middle');
  });
});

describe('the Big Five test', () => {
  it('stores a result and returns the five traits with their free text, without the aspects', async () => {
    const id = await bigFiveResult(4);
    const response = await getResult(id, db, LOCKED);
    const body = (await response.json()) as BigFiveResultResponse;
    // The aspect scores come with the report only.
    expect(JSON.stringify(body)).not.toContain('"aspects"');
    expect(body).toMatchObject({ kind: 'big-five', id, version: 'b1', unlocked: false, flags: [] });
    expect(body.traits.map((trait) => [trait.trait, trait.name, trait.pct, trait.band])).toEqual([
      ['O', 'Openness to experience', 75, 'higher'],
      ['C', 'Conscientiousness', 75, 'higher'],
      ['E', 'Extraversion', 75, 'higher'],
      ['A', 'Agreeableness', 75, 'higher'],
      ['N', 'Neuroticism', 75, 'higher'],
    ]);
    for (const trait of body.traits) {
      expect(trait.measures.length).toBeGreaterThan(20);
      expect(trait.summary.length).toBeGreaterThan(20);
    }
  });

  it('refuses answers that are incomplete or belong to the other test', async () => {
    const answers = Object.fromEntries(b1.items.map((item) => [item.id, 3]));
    const post = (body: unknown) =>
      createResult(new Request('http://localhost/api/results', { method: 'POST', body: JSON.stringify(body) }), db);
    const missing = Object.fromEntries(Object.entries(answers).filter(([id]) => id !== 'b1-100'));
    expect((await post({ version: 'b1', answers: missing })).status).toBe(400);
    expect((await post({ version: 'b1', answers: { ...answers, 'p1-01': 3 } })).status).toBe(400);
    expect((await post({ version: 'b2', answers })).status).toBe(400);
  });

  it('the report adds the longer text and both aspects of every trait', async () => {
    const { code } = await buy();
    const id = await bigFiveResult(2);
    const body = (await (await getReport(id, db, withCode(code))).json()) as BigFiveReport;
    expect(body).toMatchObject({ kind: 'big-five', id, version: 'b1', questionCount: 100 });
    expect(body.traits.map((trait) => [trait.trait, trait.pct, trait.band])).toEqual([
      ['O', 25, 'lower'],
      ['C', 25, 'lower'],
      ['E', 25, 'lower'],
      ['A', 25, 'lower'],
      ['N', 25, 'lower'],
    ]);
    const openness = body.traits[0]!;
    expect(openness.depth.length).toBeGreaterThan(200);
    expect(openness.aspects.map((aspect) => [aspect.aspect, aspect.name, aspect.pct, aspect.band])).toEqual([
      ['intellect', 'Intellect', 25, 'lower'],
      ['openness', 'Openness', 25, 'lower'],
    ]);
    expect(body.traits.flatMap((trait) => trait.aspects)).toHaveLength(10);
  });

  it('compares two Big Five results for free, and adds the couple text with the unlock', async () => {
    const [a, b, close] = await Promise.all([bigFiveResult(4), bigFiveResult(2), bigFiveResult(4)]);
    const free = (await (await getCompare(a, b, db, LOCKED)).json()) as BigFiveCompareResponse;
    expect(free).toMatchObject({ kind: 'big-five', a: { id: a }, b: { id: b }, unlocked: false, couple: null, similarity: 50 });
    expect(free.traits.map((pair) => [pair.trait, pair.a, pair.b, pair.alike])).toEqual([
      ['O', 75, 25, false],
      ['C', 75, 25, false],
      ['E', 75, 25, false],
      ['A', 75, 25, false],
      ['N', 75, 25, false],
    ]);

    const { code } = await buy();
    const paid = (await (await getCompare(a, close, db, withCode(code))).json()) as BigFiveCompareResponse;
    expect(paid.similarity).toBe(100);
    expect(paid.couple?.map((section) => section.heading)).toEqual(['Alike', 'Alike', 'Alike', 'Alike', 'Alike']);
    expect(paid.couple?.[0]?.title).toBe('Openness to experience, together');
    expect(paid.couple?.[0]?.questions.length).toBeGreaterThan(1);
  });

  it('never compares results from different tests', async () => {
    const response = await getCompare(await typeResult(), await bigFiveResult(), db, LOCKED);
    expect(response.status).toBe(409);
  });
});

describe('GET /api/compare/:a/:b for the four-letter test', () => {
  it('compares two results for free, without the couple report text', async () => {
    const a = await typeResult(4);
    const b = await typeResult(2);
    const response = await getCompare(a, b, db, LOCKED);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    const text = await response.text();
    expect(text).not.toContain('Questions to talk through');
    const body = JSON.parse(text) as CompareResponse;
    expect(body.a).toEqual({ id: a, type: 'INFP' });
    expect(body.b).toEqual({ id: b, type: 'ESTJ' });
    expect(body.axes.map((axis) => [axis.axis, axis.alike, axis.difference])).toEqual([
      ['EI', false, 50],
      ['SN', false, 50],
      ['TF', false, 50],
      ['JP', false, 50],
    ]);
    expect(body).toMatchObject({ kind: 'type', similarity: 50, unlocked: false, couple: null });
  });

  it('rejects the same result twice and unknown results', async () => {
    const a = await typeResult();
    const same = await getCompare(a, a, db, LOCKED);
    expect(same.status).toBe(400);
    expect((await getCompare(a, 'abcdefghjkmnpqrs', db, LOCKED)).status).toBe(404);
  });

  it('with the unlock: "both" text where alike, "one of each" where different', async () => {
    const { code } = await buy();
    const [a, alike, different] = await Promise.all([typeResult(4), typeResult(4), typeResult(2)]);
    const same = (await (await getCompare(a, alike, db, withCode(code))).json()) as CompareResponse;
    expect(same.couple?.map((section) => section.heading)).toEqual(['Both I', 'Both N', 'Both F', 'Both P']);
    expect(same.couple?.[0]?.title).toBe('Extraversion and Introversion, together');
    expect(same.couple?.[0]?.body).toContain('You both lean toward quiet');
    const apart = (await (await getCompare(different, a, db, withCode(code))).json()) as CompareResponse;
    expect(apart.couple?.map((section) => section.heading)).toEqual(['One E, one I', 'One S, one N', 'One T, one F', 'One J, one P']);
  });
});
