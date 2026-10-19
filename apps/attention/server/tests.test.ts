import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { scoreSart, type SartTrial } from '../src/lib/sart-score.ts';
import { buildNorms, getNorms, MIN_NORM_COUNT, parseSummary, recordTest, TEST_SUBMISSIONS, type TestSummary } from './tests.ts';
import { createTestDb, type TestDb } from './testing.ts';

let testDb: TestDb;
let db: D1Database;

beforeAll(async () => {
  testDb = await createTestDb();
  db = testDb.db;
});
afterAll(() => testDb.dispose());
beforeEach(async () => {
  await db.prepare('DELETE FROM test_results').run();
});

/** A real summary, made by the app's own scoring from a quick run. */
function summary(overrides: Partial<TestSummary> = {}): TestSummary {
  const trials: SartTrial[] = Array.from({ length: 108 }, (_, i) => {
    const digit = (i % 9) + 1;
    return { digit, size: 0, taps: digit === 3 ? (i < 18 ? [300] : []) : i % 40 === 0 ? [] : [280 + (i % 7) * 15] };
  });
  const s = scoreSart(trials);
  return {
    version: s.version,
    length: 'quick',
    nth: 1,
    commissions: s.commissions,
    omissions: s.omissions,
    anticipations: s.anticipations,
    meanRt: s.meanRt,
    sdRt: s.sdRt,
    cv: s.cv,
    score: s.score,
    ...overrides,
  };
}

const post = (body: unknown) =>
  recordTest(new Request('https://example.test/api/tests', { method: 'POST', body: JSON.stringify(body) }), db, new Date('2026-10-15T09:30:00Z'));

describe('POST /api/tests', () => {
  it('stores a valid summary with the day only, and nothing else about the person', async () => {
    const response = await post(summary());
    expect(response.status).toBe(201);
    const row = await db.prepare('SELECT * FROM test_results').first<Record<string, unknown>>();
    expect(row).toMatchObject({ length: 'quick', nth: 1, created_on: '2026-10-15' });
    expect(Object.keys(row!).sort()).toEqual(
      ['anticipations', 'commissions', 'created_on', 'cv', 'id', 'length', 'mean_rt', 'nth', 'omissions', 'score', 'sd_rt', 'version'].sort(),
    );
    expect(String(row!.id).length).toBeGreaterThanOrEqual(12);
  });

  it('accepts a run with no correct taps at all', async () => {
    expect((await post(summary({ omissions: 96, meanRt: null, sdRt: null, cv: null, score: 25, commissions: 6 }))).status).toBe(201);
  });

  it.each([
    ['an old version', { version: 0 }],
    ['an unknown length', { length: 'medium' }],
    ['more taps on 3 than there were 3s', { commissions: 13 }],
    ['more misses than numbers', { omissions: 97 }],
    ['a reaction time longer than the test window', { meanRt: 2000 }],
    ['a score that does not match its parts', { score: 99 }],
    ['a fractional test number', { nth: 1.5 }],
  ])('refuses %s', async (_, override) => {
    const response = await post({ ...summary(), ...override });
    expect(response.status).toBe(400);
    expect(await db.prepare('SELECT COUNT(*) AS n FROM test_results').first('n')).toBe(0);
  });

  it('refuses broken JSON and oversized bodies', async () => {
    const broken = await recordTest(new Request('https://example.test/api/tests', { method: 'POST', body: '{' }), db);
    expect(broken.status).toBe(400);
    const big = await recordTest(new Request('https://example.test/api/tests', { method: 'POST', body: 'x'.repeat(3000) }), db);
    expect(big.status).toBe(413);
  });

  it('takes 10 results a minute from one network, then refuses, and other networks are counted on their own', async () => {
    const limit = { secret: 'test-secret-that-is-long-enough-0123456789', limits: TEST_SUBMISSIONS };
    const from = (address: string) =>
      recordTest(
        new Request('https://example.test/api/tests', { method: 'POST', body: JSON.stringify(summary()), headers: { 'CF-Connecting-IP': address } }),
        db,
        new Date('2026-10-15T09:30:00Z'),
        limit,
      );
    for (let i = 0; i < 10; i++) expect((await from('203.0.113.9')).status).toBe(201);
    expect((await from('203.0.113.9')).status).toBe(429);
    expect((await from('198.51.100.4')).status).toBe(201);
    expect(await db.prepare('SELECT COUNT(*) AS n FROM test_results').first('n')).toBe(11);
    const keys = (await db.prepare('SELECT key FROM rate_limits').all<{ key: string }>()).results.map((row) => row.key);
    expect(keys.every((key) => key.startsWith('tests:') && !key.includes('203.0.113.9'))).toBe(true);
  });

  it('matches the score the app shows, worked out again on the server', () => {
    expect(parseSummary(summary())).not.toBeNull();
    expect(parseSummary(summary({ length: 'full' }))).toBeNull();
  });
});

describe('norms', () => {
  async function fill(n: number, nth = 1, score = 80) {
    const s = summary();
    const statements = Array.from({ length: n }, (_, i) =>
      db
        .prepare(
          `INSERT INTO test_results (id, version, length, nth, commissions, omissions, anticipations, mean_rt, sd_rt, cv, score, created_on)
           VALUES (?, ?, 'quick', ?, 0, 0, 0, 300, 50, 0.17, ?, '2026-10-15')`,
        )
        .bind(`row${nth}-${score}-${i}-abcdefgh`, s.version, nth, score),
    );
    if (statements.length) await db.batch(statements);
  }

  it('is not ready until there are 200 first results', async () => {
    await fill(MIN_NORM_COUNT - 1);
    expect(await buildNorms(db, 'quick')).toMatchObject({ ready: false, count: 199 });
    expect(await buildNorms(db, 'quick')).not.toHaveProperty('scores');
  });

  it('counts only first tests, so repeat takers do not tilt it', async () => {
    await fill(150, 1);
    await fill(300, 2);
    expect(await buildNorms(db, 'quick')).toMatchObject({ ready: false, count: 150 });
  });

  it('gives a count for every score from 0 to 100 once ready', async () => {
    await fill(150, 1, 70);
    await fill(60, 1, 90);
    const norms = await buildNorms(db, 'quick');
    expect(norms.ready).toBe(true);
    if (!norms.ready) return;
    expect(norms.scores).toHaveLength(101);
    expect(norms.scores[70]).toBe(150);
    expect(norms.scores[90]).toBe(60);
    expect(norms.count).toBe(210);
  });

  it('keeps the lengths apart', async () => {
    await fill(250, 1);
    expect(await buildNorms(db, 'full')).toMatchObject({ ready: false, count: 0 });
  });

  it('answers GET with an hour of caching, and refuses an unknown length', async () => {
    const response = await getNorms(new Request('https://example.test/api/norms?length=quick'), db);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');
    expect(await response.json()).toMatchObject({ length: 'quick', ready: false });
    expect((await getNorms(new Request('https://example.test/api/norms?length=x'), db)).status).toBe(400);
  });

  it('serves a cached answer without asking the database again', async () => {
    const store = new Map<string, Response>();
    const cache = {
      match: async (req: Request) => store.get(req.url)?.clone(),
      put: async (req: Request, res: Response) => void store.set(req.url, res),
    } as unknown as Cache;
    const first = await getNorms(new Request('https://example.test/api/norms?length=quick'), db, cache);
    expect(await first.json()).toMatchObject({ count: 0 });
    await fill(5);
    const second = await getNorms(new Request('https://example.test/api/norms?length=quick'), db, cache);
    expect(await second.json()).toMatchObject({ count: 0 });
  });
});
