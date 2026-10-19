import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { GlobalAnswer, HourAnswer } from '../src/lib/totals-types.ts';
import { runZ, stouffer, type Aim } from '../src/lib/scoring.ts';
import { STALE_AFTER_MS } from './runs.ts';
import { createTestDb, type TestDb } from './testing.ts';
import { CHART_POINTS, edgeCached, getGlobal, getHour, thin } from './totals.ts';

let testDb: TestDb;
let db: D1Database;

beforeAll(async () => {
  testDb = await createTestDb();
  db = testDb.db;
});
afterAll(() => testDb.dispose());
beforeEach(async () => {
  await db.prepare('DELETE FROM runs').run();
});

const NOW = Date.parse('2026-10-16T12:00:00Z');
let counter = 0;

interface Insert {
  device?: string;
  aim?: Aim;
  n?: number;
  deviation?: number;
  status?: 'running' | 'complete' | 'abandoned';
  startedMs?: number;
  hour?: string | null;
  source?: string;
}

async function insert(row: Insert = {}) {
  const aim = row.aim ?? 'right';
  const n = row.n ?? 4000;
  const deviation = row.deviation ?? 0;
  counter += 1;
  await db
    .prepare(
      `INSERT INTO runs (id, device_id, created_at, started_ms, kind, aim, source, length_bits, n, deviation, z, status,
         hour_event, bits, batch_times, ended_at)
       VALUES (?, ?, '', ?, 'tug', ?, ?, 4000, ?, ?, ?, ?, ?, NULL, '[]', NULL)`,
    )
    .bind(
      `run${String(counter).padStart(13, '0')}`,
      row.device ?? 'device0000000001',
      row.startedMs ?? NOW - 3600_000 + counter,
      aim,
      row.source ?? 'crypto',
      n,
      deviation,
      runZ(deviation, aim, 4000),
      row.status ?? 'complete',
      row.hour ?? null,
    )
    .run();
}

const global = async (query = '') =>
  (await (await getGlobal(new URL(`http://localhost/api/global${query}`), db, NOW)).json()) as GlobalAnswer;

describe('the global result', () => {
  it('combines every finished run with Stouffer, counts devices, bits and abandoned runs', async () => {
    await insert({ device: 'devicea00000001', aim: 'right', deviation: 100 });
    await insert({ device: 'devicea00000001', aim: 'left', deviation: 60 });
    await insert({ device: 'deviceb00000001', aim: 'left', n: 1000, deviation: -40, status: 'abandoned' });
    const answer = await global();
    const zs = [runZ(100, 'right', 4000), runZ(60, 'left', 4000), runZ(-40, 'left', 4000)];
    expect(answer.totals).toMatchObject({ runs: 3, people: 2, bits: 9000, abandoned: 1 });
    expect(answer.totals.combinedZ).toBeCloseTo(stouffer(zs), 12);
    expect(answer.totals.abandonedShare).toBeCloseTo(1 / 3, 12);
  });

  it('charts the running deviation toward each aim', async () => {
    await insert({ aim: 'right', deviation: 100 });
    await insert({ aim: 'left', deviation: 60 });
    await insert({ aim: 'left', n: 1000, deviation: -40, status: 'abandoned' });
    const { chart } = await global();
    expect(chart.bits).toEqual([0, 4000, 8000, 9000]);
    // +100 toward right, then 60 more 1s is −60 toward left, then 40 more 0s is +40 toward left.
    expect(chart.deviation).toEqual([0, 100, 40, 80]);
  });

  it('waits for runs in progress, and counts lost connections as abandoned', async () => {
    await insert({ status: 'running', startedMs: NOW - 5_000 });
    await insert({ status: 'running', n: 0, startedMs: NOW - 20_000 - STALE_AFTER_MS - 1 });
    const answer = await global();
    expect(answer.inProgress).toBe(1);
    expect(answer.totals).toMatchObject({ runs: 1, abandoned: 1, bits: 0, combinedZ: 0 });
    expect(answer.chart.bits).toEqual([0]);
  });

  it('splits by source, by kind and by Intention Hour', async () => {
    await insert({ hour: '2026-10-15', deviation: 50 });
    await insert({ hour: '2026-10-15', device: 'deviceb00000001' });
    await insert({ hour: null, deviation: -20 });
    const answer = await global();
    expect(answer.byWhen.hour).toMatchObject({ runs: 2, people: 2 });
    expect(answer.byWhen.anytime).toMatchObject({ runs: 1, people: 1 });
    expect(answer.bySource.crypto!.runs).toBe(3);
    expect(answer.byKind.tug!.runs).toBe(3);
    expect((await global('?kind=tug')).totals.runs).toBe(3);
  });

  it('is cached for 5 minutes and refuses unknown kinds', async () => {
    const response = await getGlobal(new URL('http://localhost/api/global'), db, NOW);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=300');
    expect((await getGlobal(new URL('http://localhost/api/global?kind=dice'), db, NOW)).status).toBe(400);
  });

  it('is empty but well formed with no runs', async () => {
    const answer = await global();
    expect(answer.totals).toEqual({ runs: 0, people: 0, bits: 0, combinedZ: 0, abandoned: 0, abandonedShare: 0 });
    expect(answer.chart).toEqual({ bits: [0], deviation: [0] });
  });
});

describe('Intention Hour totals', () => {
  it('combines each event and all of them, newest first', async () => {
    await insert({ hour: '2026-10-14', deviation: 30 });
    await insert({ hour: '2026-10-15', deviation: 50, device: 'devicea00000001' });
    await insert({ hour: '2026-10-15', deviation: -10, device: 'deviceb00000001' });
    await insert({ hour: null, deviation: 300 });
    const response = await getHour(db, NOW);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=60');
    const answer = (await response.json()) as HourAnswer;
    expect(answer.all.runs).toBe(3);
    expect(answer.events.map((e) => e.key)).toEqual(['2026-10-15', '2026-10-14']);
    expect(answer.events[0]).toMatchObject({ runs: 2, people: 2 });
    expect(answer.events[0]!.combinedZ).toBeCloseTo(stouffer([runZ(50, 'right', 4000), runZ(-10, 'right', 4000)]), 12);
  });
});

describe('thinning the chart', () => {
  it('keeps the first and last points and at most the limit', () => {
    const bits = Array.from({ length: 5000 }, (_, i) => i * 10);
    const deviation = bits.map((b) => b % 7);
    const out = thin(bits, deviation);
    expect(out.bits).toHaveLength(CHART_POINTS);
    expect(out.bits[0]).toBe(0);
    expect(out.bits.at(-1)).toBe(49_990);
    expect(out.deviation.at(-1)).toBe(deviation.at(-1));
    expect(thin([0, 1], [0, 1])).toEqual({ bits: [0, 1], deviation: [0, 1] });
  });
});

describe('edgeCached', () => {
  /** A Cache that keeps responses in a map, keyed by URL. */
  function memoryCache() {
    const store = new Map<string, Response>();
    return {
      store,
      cache: {
        match: async (key: Request) => store.get(key.url)?.clone(),
        put: async (key: Request, response: Response) => void store.set(key.url, response),
      } as unknown as Cache,
    };
  }

  it('builds once, then answers from the cache, whatever extra query a visitor adds', async () => {
    const { cache, store } = memoryCache();
    let builds = 0;
    const build = async () => {
      builds++;
      return Response.json({ n: builds });
    };
    const first = await edgeCached(new Request('https://x.test/api/global?kind=all'), cache, '/api/global?kind=all', build);
    const second = await edgeCached(new Request('https://x.test/api/global?kind=all&bust=1'), cache, '/api/global?kind=all', build);
    expect(await first.json()).toEqual({ n: 1 });
    expect(await second.json()).toEqual({ n: 1 });
    expect(builds).toBe(1);
    expect([...store.keys()]).toEqual(['https://x.test/api/global?kind=all']);
  });

  it('does not cache an error', async () => {
    const { cache, store } = memoryCache();
    await edgeCached(new Request('https://x.test/api/global?kind=dice'), cache, '/api/global?kind=dice', async () => new Response(null, { status: 400 }));
    expect(store.size).toBe(0);
  });
});

