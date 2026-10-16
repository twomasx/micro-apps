import { formatCode, hashCode, unlockCodeFor } from '@micro/payments/unlock-codes';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { MeAnswer } from '../src/lib/me-types.ts';
import { runZ, stouffer } from '../src/lib/scoring.ts';
import { packBits } from './bits.ts';
import { DEVICE_HEADER, UNLOCK_HEADER } from './labpass.ts';
import { FREE_RUNS, getMe, getMeCsv } from './me.ts';
import { createTestDb, type TestDb } from './testing.ts';

let testDb: TestDb;
let db: D1Database;
let code: string;

const DEVICE = 'devicemine000001';
const OTHER = 'deviceother00001';
const NOW = Date.parse('2026-10-16T12:00:00Z');

beforeAll(async () => {
  testDb = await createTestDb();
  db = testDb.db;
  code = formatCode(await unlockCodeFor('test-secret-of-at-least-32-characters', 'cs_test_me'));
});
afterAll(() => testDb.dispose());
beforeEach(async () => {
  await db.prepare('DELETE FROM runs').run();
  await db.prepare('DELETE FROM purchases').run();
});

let counter = 0;
async function insert(device: string, deviation: number, extra: { status?: string; n?: number; startedMs?: number } = {}) {
  counter += 1;
  const n = extra.n ?? 4000;
  await db
    .prepare(
      `INSERT INTO runs (id, device_id, created_at, started_ms, kind, aim, source, length_bits, n, deviation, z, status,
         hour_event, bits, batch_times, ended_at)
       VALUES (?, ?, ?, ?, 'tug', 'right', 'crypto', 4000, ?, ?, ?, ?, NULL, ?, '[]', NULL)`,
    )
    .bind(
      `run${String(counter).padStart(13, '0')}`,
      device,
      new Date(NOW - 3600_000 + counter).toISOString(),
      extra.startedMs ?? NOW - 3600_000 + counter,
      n,
      deviation,
      runZ(deviation, 'right', 4000),
      extra.status ?? 'complete',
      packBits(Array.from({ length: n }, (_, i) => (i < (n + deviation) / 2 ? 1 : 0))),
    )
    .run();
}

async function paidPass() {
  await db
    .prepare(
      `INSERT INTO purchases (id, stripe_session_id, unlock_code_hash, amount_cents, currency, status, created_at)
       VALUES ('p1', 'cs_test_me', ?, 499, 'usd', 'paid', '')`,
    )
    .bind(await hashCode(code.replace(/-/g, '')))
    .run();
}

const request = (headers: Record<string, string>) => new Request('http://localhost/api/me', { headers });
const me = async (headers: Record<string, string> = { [DEVICE_HEADER]: DEVICE }) =>
  (await (await getMe(request(headers), db, { mode: 'test' }, NOW)).json()) as MeAnswer;

describe('your runs', () => {
  it('free: your last 5, newest first, and how many there are in all', async () => {
    for (let i = 0; i < 8; i++) await insert(DEVICE, i * 10);
    await insert(OTHER, 500);
    const answer = await me();
    expect(answer.full).toBe(false);
    expect(answer.totalRuns).toBe(8);
    expect(answer.runs).toHaveLength(FREE_RUNS);
    expect(answer.runs.map((r) => r.deviation)).toEqual([70, 60, 50, 40, 30]);
    expect(answer.lifetime).toBeNull();
    expect(answer.chart).toBeNull();
  });

  it('Lab Pass: every run, the lifetime total and the chart', async () => {
    await paidPass();
    for (const d of [20, -40, 60]) await insert(DEVICE, d);
    await insert(DEVICE, 10, { status: 'abandoned', n: 1000 });
    const answer = await me({ [DEVICE_HEADER]: DEVICE, [UNLOCK_HEADER]: code });
    expect(answer.full).toBe(true);
    expect(answer.runs).toHaveLength(4);
    expect(answer.lifetime!.runs).toBe(4);
    expect(answer.lifetime!.bits).toBe(13_000);
    expect(answer.lifetime!.combinedZ).toBeCloseTo(stouffer([20, -40, 60, 10].map((d) => runZ(d, 'right', 4000))), 12);
    expect(answer.chart).toEqual({ bits: [0, 4000, 8000, 12_000, 13_000], deviation: [0, 20, -20, 40, 50] });
  });

  it('a wrong or unpaid code is the free view', async () => {
    await insert(DEVICE, 0);
    expect((await me({ [DEVICE_HEADER]: DEVICE, [UNLOCK_HEADER]: 'AAAA-BBBB-CCCC-DDDD' })).full).toBe(false);
    await db
      .prepare(
        `INSERT INTO purchases (id, stripe_session_id, unlock_code_hash, amount_cents, currency, status, created_at)
         VALUES ('p2', 'cs_test_me', ?, 499, 'usd', 'pending', '')`,
      )
      .bind(await hashCode(code.replace(/-/g, '')))
      .run();
    expect((await me({ [DEVICE_HEADER]: DEVICE, [UNLOCK_HEADER]: code })).full).toBe(false);
  });

  it('leaves out runs still in progress', async () => {
    await insert(DEVICE, 0, { status: 'running', n: 0, startedMs: NOW - 5000 });
    await insert(DEVICE, 0);
    expect((await me()).totalRuns).toBe(1);
  });

  it('needs a device id', async () => {
    expect((await getMe(request({}), db, { mode: 'test' }, NOW)).status).toBe(400);
    expect((await getMe(request({ [DEVICE_HEADER]: 'bad id' }), db, { mode: 'test' }, NOW)).status).toBe(400);
  });
});

describe('the CSV', () => {
  it('comes with Lab Pass only', async () => {
    await insert(DEVICE, 4);
    expect((await getMeCsv(request({ [DEVICE_HEADER]: DEVICE }), db, { mode: 'test' }, NOW)).status).toBe(403);
  });

  it('has every run and every bit', async () => {
    await paidPass();
    await insert(DEVICE, 4, { n: 8 });
    await insert(OTHER, 0);
    const response = await getMeCsv(request({ [DEVICE_HEADER]: DEVICE, [UNLOCK_HEADER]: code }), db, { mode: 'test' }, NOW);
    expect(response.headers.get('Content-Type')).toContain('text/csv');
    const lines = (await response.text()).trim().split('\r\n');
    expect(lines[0]).toBe('run_id,started_at,kind,aim,source,planned_bits,bits_received,deviation,z,status,intention_hour,bits');
    expect(lines).toHaveLength(2);
    expect(lines[1]!.endsWith(',complete,,11111100')).toBe(true);
  });
});
