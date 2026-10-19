import { formatCode, hashCode, unlockCodeFor } from '@micro/payments/unlock-codes';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { BitsEvent, EndEvent, RunResult, StartEvent } from '../src/lib/protocol.ts';
import { runZ } from '../src/lib/scoring.ts';
import { SseParser, type SseEvent } from '../src/lib/sse.ts';
import { bitString, packBits, randomBits, unpackBits } from './bits.ts';
import { UNLOCK_HEADER } from './labpass.ts';
import { effectiveStatus, getRun, RUN_STARTS, STALE_AFTER_MS, startRun, type Clock, type RunDeps } from './runs.ts';
import { createTestDb, type TestDb } from './testing.ts';

let testDb: TestDb;
let db: D1Database;

beforeAll(async () => {
  testDb = await createTestDb();
  db = testDb.db;
});
afterAll(() => testDb.dispose());
beforeEach(async () => {
  await db.prepare('DELETE FROM runs').run();
  await db.prepare('DELETE FROM purchases').run();
});

const DEVICE = 'device0000000001';
const T0 = 1_760_000_000_000;

const post = (body: unknown) =>
  new Request('http://localhost/api/runs', { method: 'POST', body: JSON.stringify(body) });

/** A clock that jumps forward on every sleep. `stepOf` says how far a sleep of `ms` really moves it. */
function jumpingClock(stepOf: (ms: number) => number = (ms) => ms): Clock {
  let now = T0;
  return {
    now: () => now,
    sleep: async (ms) => {
      now += stepOf(ms);
    },
  };
}

/** A clock the test moves by hand, one sleep at a time. */
function handClock() {
  let now = T0;
  const waiting: (() => void)[] = [];
  const clock: Clock = {
    now: () => now,
    sleep: (ms) =>
      new Promise((resolve) => {
        waiting.push(() => {
          now += ms;
          resolve();
        });
      }),
  };
  /** Lets the next sleep finish, once the run has started one. */
  const step = async () => {
    while (waiting.length === 0) await new Promise((resolve) => setTimeout(resolve, 1));
    waiting.shift()!();
  };
  return { clock, step };
}

function deps(clock: Clock, extra: Partial<RunDeps> = {}) {
  const pending: Promise<unknown>[] = [];
  return {
    deps: { db, mode: 'test', clock, waitUntil: (p: Promise<unknown>) => void pending.push(p), ...extra } satisfies RunDeps,
    settled: () => Promise.all(pending),
  };
}

async function readEvents(response: Response): Promise<SseEvent[]> {
  const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader();
  const parser = new SseParser();
  const events: SseEvent[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return events;
    events.push(...parser.push(value));
  }
}

async function result(runId: string, now = T0): Promise<RunResult> {
  return (await (await getRun(runId, db, { now: () => now, sleep: async () => {} })).json()) as RunResult;
}

interface Row {
  status: string;
  n: number;
  batch_times: string;
  started_ms: number;
}
const row = (runId: string) =>
  db.prepare('SELECT status, n, batch_times, started_ms FROM runs WHERE id = ?').bind(runId).first<Row>();

describe('a full run', () => {
  it('streams 4,000 bits over 20 seconds, then saves them all', async () => {
    const { deps: d, settled } = deps(jumpingClock());
    const response = await startRun(post({ deviceId: DEVICE, kind: 'tug' }), d);
    expect(response.status).toBe(201);
    expect(response.headers.get('Content-Type')).toContain('text/event-stream');

    const events = await readEvents(response);
    await settled();
    const start = JSON.parse(events[0]!.data) as StartEvent;
    expect(events[0]!.event).toBe('start');
    expect(start).toMatchObject({ lengthBits: 4000, source: 'crypto', bitsPerSecond: 200 });
    expect(['left', 'right']).toContain(start.aim);
    expect(start.runId).toMatch(/^[a-z0-9]{16}$/);

    const batches = events.filter((e) => e.event === 'bits').map((e) => JSON.parse(e.data) as BitsEvent);
    expect(batches).toHaveLength(80);
    expect(batches.every((b) => b.bits.length === 50)).toBe(true);
    const streamed = batches.map((b) => b.bits).join('');
    expect(streamed).toHaveLength(4000);

    const end = JSON.parse(events.at(-1)!.data) as EndEvent;
    expect(events.at(-1)!.event).toBe('end');
    expect(end.status).toBe('complete');
    expect(end.n).toBe(4000);
    expect(end.z).toBeCloseTo(runZ(end.deviation, start.aim, 4000), 12);

    const saved = await result(start.runId);
    expect(saved).toMatchObject({ status: 'complete', n: 4000, deviation: end.deviation, aim: start.aim });
    expect(saved.bits).toBe(streamed);
    expect(saved.z).toBeCloseTo(end.z, 12);
  });

  it('writes the run once at the start and once at the end', async () => {
    const statements: string[] = [];
    const counting = new Proxy(db, {
      get(target, key) {
        if (key === 'prepare') {
          return (sql: string) => {
            statements.push(sql.trim().split(/\s+/)[0]!);
            return target.prepare(sql);
          };
        }
        const value = Reflect.get(target, key) as unknown;
        return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(target) : value;
      },
    });
    const { deps: d, settled } = deps(jumpingClock(), { db: counting });
    await readEvents(await startRun(post({ deviceId: DEVICE, kind: 'tug' }), d));
    await settled();
    // Reads (the free-run count) are fine; writes happen exactly twice.
    expect(statements.filter((sql) => sql !== 'SELECT')).toEqual(['INSERT', 'UPDATE']);
  });

  it('when the final write fails, closes the stream and saves the run as abandoned', async () => {
    let failed = false;
    const flaky = new Proxy(db, {
      get(target, key) {
        if (key === 'prepare') {
          return (sql: string) => {
            if (!failed && sql.trim().startsWith('UPDATE')) {
              failed = true;
              const broken = { run: () => Promise.reject(new Error('D1 is down')) };
              return { bind: () => broken };
            }
            return target.prepare(sql);
          };
        }
        const value = Reflect.get(target, key) as unknown;
        return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(target) : value;
      },
    });
    const { deps: d, settled } = deps(jumpingClock(), { db: flaky });
    // Resolves: the stream ends instead of leaving the browser waiting.
    const events = await readEvents(await startRun(post({ deviceId: DEVICE, kind: 'tug' }), d));
    await settled();
    expect(events.some((e) => e.event === 'end')).toBe(false);
    const { runId } = JSON.parse(events[0]!.data) as StartEvent;
    const saved = await result(runId);
    expect(saved.status).toBe('abandoned');
    expect(saved.n).toBe(4000);
  });
});

describe('real time', () => {
  /** Every batch, added up, stays within what 200 bits a second allows at the moment it was made. */
  async function checkPace(stepOf: (ms: number) => number) {
    const { deps: d, settled } = deps(jumpingClock(stepOf));
    const events = await readEvents(await startRun(post({ deviceId: DEVICE, kind: 'tug' }), d));
    await settled();
    const { runId } = JSON.parse(events[0]!.data) as StartEvent;
    const saved = await row(runId);
    const times = JSON.parse(saved!.batch_times) as [number, number][];
    let total = 0;
    for (const [ms, count] of times) {
      total += count;
      expect(total).toBeLessThanOrEqual(Math.floor((ms * 200) / 1000));
    }
    expect(total).toBe(4000);
    expect(times.at(-1)![0]).toBeGreaterThanOrEqual(20_000);
    return times;
  }

  it('never hands out bits faster than real time', async () => {
    const times = await checkPace((ms) => ms);
    expect(times).toHaveLength(80);
  });

  it('timers that fire early get fewer bits, and the run still takes 20 seconds', async () => {
    const times = await checkPace((ms) => Math.min(ms, 90));
    expect(times.length).toBeGreaterThan(80);
  });

  it('timers that fire late catch up without going ahead of the clock', async () => {
    await checkPace((ms) => ms + 400);
  });
});

describe('the aim', () => {
  it('refuses a run whose aim the client chose', async () => {
    for (const aim of ['left', 'right', null]) {
      const { deps: d } = deps(jumpingClock());
      const response = await startRun(post({ deviceId: DEVICE, kind: 'tug', aim }), d);
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ error: 'aim_not_allowed' });
    }
    expect(await db.prepare('SELECT COUNT(*) AS c FROM runs').first('c')).toBe(0);
  });

  it('is picked by the server from a fresh random byte', async () => {
    for (const [byte, aim] of [
      [0, 'left'],
      [1, 'right'],
      [254, 'left'],
      [255, 'right'],
    ] as const) {
      const { deps: d, settled } = deps(jumpingClock(), {
        randomBytes: (count) => new Uint8Array(count).fill(byte),
      });
      const events = await readEvents(await startRun(post({ deviceId: DEVICE, kind: 'tug' }), d));
      await settled();
      expect((JSON.parse(events[0]!.data) as StartEvent).aim).toBe(aim);
    }
  });
});

describe('every started run counts', () => {
  it('saves a run with the bits it had when the browser leaves early', async () => {
    const { clock, step } = handClock();
    const { deps: d, settled } = deps(clock);
    const response = await startRun(post({ deviceId: DEVICE, kind: 'tug' }), d);
    const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader();
    const parser = new SseParser();
    const events: SseEvent[] = [];
    while (events.filter((e) => e.event === 'bits').length < 3) {
      if (events.length > 0) await step();
      events.push(...parser.push((await reader.read()).value!));
    }
    await reader.cancel();
    // Let the run's waiting timer fire, so its loop sees the browser has gone and stops.
    await step();
    await settled();

    const start = JSON.parse(events[0]!.data) as StartEvent;
    const streamed = events
      .filter((e) => e.event === 'bits')
      .map((e) => (JSON.parse(e.data) as BitsEvent).bits)
      .join('');
    expect(streamed).toHaveLength(150);

    const saved = await result(start.runId);
    expect(saved.status).toBe('abandoned');
    expect(saved.n).toBe(150);
    expect(saved.bits).toBe(streamed);
    // Scored over the planned 4,000 bits, so stopping early cannot lift it.
    expect(saved.z).toBeCloseTo(runZ(saved.deviation, start.aim, 4000), 12);
  });

  it('saves the bits so far when the request is aborted (the browser disconnected)', async () => {
    const { clock, step } = handClock();
    const { deps: d, settled } = deps(clock);
    const disconnect = new AbortController();
    const request = new Request('http://localhost/api/runs', {
      method: 'POST',
      body: JSON.stringify({ deviceId: DEVICE, kind: 'tug' }),
      signal: disconnect.signal,
    });
    const response = await startRun(request, d);
    const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader();
    const { runId } = JSON.parse(new SseParser().push((await reader.read()).value!)[0]!.data) as StartEvent;
    await step();
    await step();
    disconnect.abort();
    await step();
    await settled();
    const saved = await result(runId);
    expect(saved.status).toBe('abandoned');
    expect(saved.n).toBe(100);
  });

  it('a run that left with no goodbye counts as abandoned once it is well past its end', async () => {
    const { clock } = handClock();
    const { deps: d } = deps(clock);
    const response = await startRun(post({ deviceId: DEVICE, kind: 'tug' }), d);
    const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader();
    const { runId } = JSON.parse(new SseParser().push((await reader.read()).value!)[0]!.data) as StartEvent;

    expect((await result(runId, T0 + 5_000)).status).toBe('running');
    expect((await result(runId, T0 + 20_000 + STALE_AFTER_MS + 1)).status).toBe('abandoned');
    expect((await row(runId))!.status).toBe('running');
    expect(effectiveStatus({ status: 'complete', started_ms: 0, length_bits: 4000 }, Number.MAX_SAFE_INTEGER)).toBe(
      'complete',
    );
  });
});

describe('Intention Hour', () => {
  async function hourOf(startMs: number) {
    const { deps: d, settled } = deps({ now: () => startMs, sleep: async () => {} });
    // A clock that never moves would never finish, so read only the start event and let the run go.
    const response = await startRun(post({ deviceId: DEVICE, kind: 'tug' }), d);
    const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader();
    const { runId } = JSON.parse(new SseParser().push((await reader.read()).value!)[0]!.data) as StartEvent;
    await reader.cancel();
    await settled();
    return db.prepare('SELECT hour_event FROM runs WHERE id = ?').bind(runId).first<string | null>('hour_event');
  }

  it('tags runs that start inside the window with its date', async () => {
    // 9:03 pm Pacific on Oct 15, 2026.
    expect(await hourOf(Date.parse('2026-10-16T04:03:00Z'))).toBe('2026-10-15');
    // 8:59 pm and 9:10 pm: outside.
    expect(await hourOf(Date.parse('2026-10-16T03:59:00Z'))).toBeNull();
    expect(await hourOf(Date.parse('2026-10-16T04:10:00Z'))).toBeNull();
  });
});

describe('free runs and Lab Pass', () => {
  let code: string;
  beforeAll(async () => {
    code = formatCode(await unlockCodeFor('test-secret-of-at-least-32-characters', 'cs_test_runs'));
  });

  async function paidPass() {
    await db
      .prepare(
        `INSERT INTO purchases (id, stripe_session_id, unlock_code_hash, amount_cents, currency, status, created_at)
         VALUES ('p1', 'cs_test_runs', ?, 499, 'usd', 'paid', '')`,
      )
      .bind(await hashCode(code.replace(/-/g, '')))
      .run();
  }

  /** Starts a run at `atMs` and lets it finish. Returns the response status. */
  async function runAt(atMs: number, body: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
    let now = atMs;
    const { deps: d, settled } = deps({ now: () => now, sleep: async (ms) => void (now += ms) });
    const request = new Request('http://localhost/api/runs', {
      method: 'POST',
      headers,
      body: JSON.stringify({ deviceId: DEVICE, kind: 'tug', timeZone: 'America/Los_Angeles', ...body }),
    });
    const response = await startRun(request, d);
    if (response.ok) await readEvents(response);
    await settled();
    return response;
  }

  // 10:00 am Pacific on Oct 15.
  const MORNING = Date.parse('2026-10-15T17:00:00Z');

  it('allows 5 runs a day, stopped or not, then asks for Lab Pass', async () => {
    for (let i = 0; i < 5; i++) expect((await runAt(MORNING + i * 60_000)).status).toBe(201);
    const sixth = await runAt(MORNING + 10 * 60_000);
    expect(sixth.status).toBe(429);
    expect(await sixth.json()).toMatchObject({ error: 'daily_limit' });
  });

  it("resets at midnight in the device's own time zone", async () => {
    for (let i = 0; i < 5; i++) await runAt(MORNING + i * 60_000);
    // 11:30 pm Pacific the same day: still Oct 15 there.
    expect((await runAt(Date.parse('2026-10-16T06:30:00Z'))).status).toBe(429);
    // 12:05 am Pacific on Oct 16.
    expect((await runAt(Date.parse('2026-10-16T07:05:00Z'))).status).toBe(201);
  });

  it('Lab Pass has no daily limit', async () => {
    await paidPass();
    for (let i = 0; i < 6; i++) {
      expect((await runAt(MORNING + i * 60_000, {}, { [UNLOCK_HEADER]: code })).status).toBe(201);
    }
  });

  it('longer runs need Lab Pass, and then run their full length', async () => {
    expect((await runAt(MORNING, { seconds: 120 })).status).toBe(403);
    await paidPass();
    let now = MORNING;
    const { deps: d, settled } = deps({ now: () => now, sleep: async (ms) => void (now += ms) });
    const response = await startRun(
      new Request('http://localhost/api/runs', {
        method: 'POST',
        headers: { [UNLOCK_HEADER]: code },
        body: JSON.stringify({ deviceId: DEVICE, kind: 'tug', seconds: 60 }),
      }),
      d,
    );
    const events = await readEvents(response);
    await settled();
    expect((JSON.parse(events[0]!.data) as StartEvent).lengthBits).toBe(12_000);
    expect((JSON.parse(events.at(-1)!.data) as EndEvent).n).toBe(12_000);
    expect(now - MORNING).toBeGreaterThanOrEqual(60_000);
  });

  it('an unknown time zone counts the day in UTC', async () => {
    for (let i = 0; i < 5; i++) await runAt(MORNING + i * 60_000, { timeZone: 'Mars/Olympus' });
    expect((await runAt(MORNING + 3600_000, { timeZone: 'Mars/Olympus' })).status).toBe(429);
  });
});

describe('start requests', () => {
  it.each([
    [{ kind: 'tug' }, 400, 'invalid_device'],
    [{ deviceId: 'short', kind: 'tug' }, 400, 'invalid_device'],
    [{ deviceId: DEVICE, kind: 'dice' }, 400, 'unknown_kind'],
    [{ deviceId: DEVICE, kind: 'tug', seconds: 45 }, 400, 'invalid_length'],
    [{ deviceId: DEVICE, kind: 'tug', seconds: 60 }, 403, 'lab_pass_required'],
    [[], 400, 'invalid_device'],
  ])('%j is refused', async (body, status, code) => {
    const { deps: d } = deps(jumpingClock());
    const response = await startRun(post(body), d);
    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({ error: code });
  });

  it('refuses bodies that are not JSON or too large', async () => {
    const { deps: d } = deps(jumpingClock());
    const bad = new Request('http://localhost/api/runs', { method: 'POST', body: '{' });
    expect((await startRun(bad, d)).status).toBe(400);
    const big = new Request('http://localhost/api/runs', { method: 'POST', body: 'x'.repeat(2000) });
    expect((await startRun(big, d)).status).toBe(413);
  });

  it('answers 404 for unknown run ids', async () => {
    expect((await getRun('nope', db)).status).toBe(404);
    expect((await getRun('abcdefghijkmnpqr', db)).status).toBe(404);
  });
});

describe('bits', () => {
  it('pack and unpack without loss, at any length', () => {
    for (const n of [0, 1, 7, 8, 9, 150, 4000]) {
      const bits = randomBits(n);
      const packed = packBits(bits);
      expect(packed.length).toBe(Math.ceil(n / 8));
      expect(bitString(unpackBits(Array.from(packed), n))).toBe(bitString(bits));
    }
    expect(packBits([1, 0, 0, 0, 0, 0, 0, 1, 1])).toEqual(new Uint8Array([0x81, 0x80]));
  });

  it('come from every bit of the random bytes, first bit highest', () => {
    expect(bitString(randomBits(10, () => new Uint8Array([0b10110000, 0b01000000])))).toBe('1011000001');
  });
});

describe('the event stream format', () => {
  it('reads events cut at any point', () => {
    const text = 'event: start\ndata: {"a":1}\n\n: a comment\n\nevent: bits\ndata: {"b":2}\n\n';
    for (let cut = 0; cut <= text.length; cut++) {
      const parser = new SseParser();
      const events = [...parser.push(text.slice(0, cut)), ...parser.push(text.slice(cut))];
      expect(events).toEqual([
        { event: 'start', data: '{"a":1}' },
        { event: 'bits', data: '{"b":2}' },
      ]);
    }
  });
});

describe('runs from one network', () => {
  it('are refused past the limit before a run is made, with too_many_tries', async () => {
    const limit = { secret: 'test-secret-that-is-long-enough-0123456789', limits: { ...RUN_STARTS, perMinute: 2 } };
    // Each run that starts is read to its end, so nothing is still streaming when the test finishes.
    const start = async (address: string, device: string) => {
      const { deps: d, settled } = deps(jumpingClock(), { limit });
      const request = new Request('https://example.test/api/runs', {
        method: 'POST',
        headers: { 'CF-Connecting-IP': address },
        body: JSON.stringify({ deviceId: device, kind: 'tug' }),
      });
      const response = await startRun(request, d);
      if (response.status !== 201) return response;
      await readEvents(response);
      await settled();
      return new Response(null, { status: 201 });
    };
    // Different devices on one network share its limit, so new device ids do not get around it.
    expect((await start('203.0.113.9', 'deviceaaaaaaaa01')).status).toBe(201);
    expect((await start('203.0.113.9', 'deviceaaaaaaaa02')).status).toBe(201);
    const refused = await start('203.0.113.9', 'deviceaaaaaaaa03');
    expect(refused.status).toBe(429);
    expect(((await refused.json()) as { error: string }).error).toBe('too_many_tries');
    expect(await db.prepare("SELECT COUNT(*) AS n FROM runs WHERE device_id = 'deviceaaaaaaaa03'").first('n')).toBe(0);
    expect((await start('198.51.100.4', 'deviceaaaaaaaa04')).status).toBe(201);
  });
});
