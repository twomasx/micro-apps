import {
  BATCH_MS,
  BITS_PER_SECOND,
  KINDS,
  lengthBitsFor,
  RUN_SECONDS,
  STANDARD_SECONDS,
  type BitsEvent,
  type EndEvent,
  type Kind,
  type RunResult,
  type RunSeconds,
  type RunStatus,
  type Source,
  type StartEvent,
} from '../src/lib/protocol.ts';
import { runZ, type Aim } from '../src/lib/scoring.ts';
import { formatSse } from '../src/lib/sse.ts';
import { bitString, cryptoBytes, packBits, randomBits, unpackBits, type RandomBytes } from './bits.ts';
import { error, json, randomId } from './http.ts';

const SOURCE: Source = 'crypto';
const MAX_BODY_CHARS = 1_000;
const DEVICE_ID_PATTERN = /^[a-z0-9]{12,64}$/;
const RUN_ID_PATTERN = /^[a-z0-9]{16}$/;
/** A run still marked running this long after its planned end lost its connection without a goodbye. */
export const STALE_AFTER_MS = 30_000;

export interface Clock {
  now: () => number;
  sleep: (ms: number) => Promise<void>;
}

export const realClock: Clock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

export interface RunDeps {
  db: D1Database;
  /** Keeps the final database write alive after the browser has gone. */
  waitUntil: (promise: Promise<unknown>) => void;
  clock?: Clock;
  randomBytes?: RandomBytes;
}

interface StartInput {
  deviceId: string;
  kind: Kind;
  seconds: RunSeconds;
}

function parseStart(text: string): StartInput | Response {
  if (text.length > MAX_BODY_CHARS) return error(413, 'too_large', 'The request body is too large.');
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return error(400, 'invalid_json', 'The request body must be JSON.');
  }
  if (typeof body !== 'object' || body === null) return error(400, 'invalid_body', 'Send a JSON object.');
  const fields = body as Record<string, unknown>;
  // The server alone picks the aim. A client that tries to choose it is refused, not ignored.
  if ('aim' in fields) return error(400, 'aim_not_allowed', 'The server picks the aim.');
  const { deviceId, kind, seconds = STANDARD_SECONDS } = fields;
  if (typeof deviceId !== 'string' || !DEVICE_ID_PATTERN.test(deviceId)) {
    return error(400, 'invalid_device', 'Send a device id of 12 to 64 lowercase letters and digits.');
  }
  if (!KINDS.includes(kind as Kind)) return error(400, 'unknown_kind', `Send a kind: ${KINDS.join(', ')}.`);
  if (!RUN_SECONDS.includes(seconds as RunSeconds)) {
    return error(400, 'invalid_length', `Send seconds: ${RUN_SECONDS.join(', ')}.`);
  }
  // Longer runs come with Lab Pass (build step 6).
  if (seconds !== STANDARD_SECONDS) return error(403, 'lab_pass_required', 'Longer runs come with Lab Pass.');
  return { deviceId, kind: kind as Kind, seconds: seconds as RunSeconds };
}

/** Left or right, from one fresh random byte. */
function pickAim(randomBytes: RandomBytes): Aim {
  return (randomBytes(1)[0]! & 1) === 1 ? 'right' : 'left';
}

/**
 * POST /api/runs. Creates the run, then streams its bits as Server-Sent Events.
 *
 * Every 250 ms the server makes the bits the clock allows since the start (200 a second) and sends them.
 * Bits are made at that moment, never in advance, and never faster than real time: a timer that fires early
 * simply gets fewer bits. The run is written to D1 when it starts and once more when it ends. If the
 * connection drops, the bits so far are saved and the run counts as abandoned.
 */
export async function startRun(request: Request, deps: RunDeps): Promise<Response> {
  const input = parseStart(await request.text());
  if (input instanceof Response) return input;

  const clock = deps.clock ?? realClock;
  const randomBytes = deps.randomBytes ?? cryptoBytes;
  const { db } = deps;
  const runId = randomId();
  const aim = pickAim(randomBytes);
  const lengthBits = lengthBitsFor(input.seconds);
  const startedMs = clock.now();

  await db
    .prepare(
      `INSERT INTO runs (id, device_id, created_at, started_ms, kind, aim, source, length_bits, n, deviation, z,
         status, hour_event, bits, batch_times, ended_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 'running', NULL, NULL, '[]', NULL)`,
    )
    .bind(runId, input.deviceId, new Date(startedMs).toISOString(), startedMs, input.kind, aim, SOURCE, lengthBits)
    .run();

  const bits = new Uint8Array(lengthBits);
  const batchTimes: [number, number][] = [];
  let n = 0;
  let deviation = 0;
  let closed = false;
  let saved: Promise<void> | null = null;

  /** The one write at the end. Safe to call twice; only the first call writes. */
  const save = (status: EndEvent['status']): Promise<void> => {
    saved ??= db
      .prepare(
        `UPDATE runs SET n = ?, deviation = ?, z = ?, status = ?, bits = ?, batch_times = ?, ended_at = ?
         WHERE id = ? AND status = 'running'`,
      )
      .bind(
        n,
        deviation,
        runZ(deviation, aim, lengthBits),
        status,
        packBits(bits.subarray(0, n)),
        JSON.stringify(batchTimes),
        new Date(clock.now()).toISOString(),
        runId,
      )
      .run()
      .then(() => undefined);
    return saved;
  };

  /** The browser left: stopped early, closed the tab or lost the network. The run still counts. */
  const leave = () => {
    if (closed) return;
    closed = true;
    deps.waitUntil(save('abandoned'));
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: unknown) => {
        if (!closed) controller.enqueue(encoder.encode(formatSse(event, data)));
      };
      send('start', { runId, aim, lengthBits, source: SOURCE, bitsPerSecond: BITS_PER_SECOND } satisfies StartEvent);

      const loop = async () => {
        for (let tick = 1; n < lengthBits; tick++) {
          await clock.sleep(Math.max(0, startedMs + tick * BATCH_MS - clock.now()));
          if (closed) return;
          const allowed = Math.min(lengthBits, Math.floor(((clock.now() - startedMs) * BITS_PER_SECOND) / 1000));
          const count = allowed - n;
          if (count <= 0) continue;
          const batch = randomBits(count, randomBytes);
          bits.set(batch, n);
          for (const bit of batch) deviation += bit ? 1 : -1;
          n += count;
          batchTimes.push([clock.now() - startedMs, count]);
          send('bits', { bits: bitString(batch), n, deviation } satisfies BitsEvent);
        }
        await save('complete');
        if (closed) return;
        send('end', { status: 'complete', n, deviation, z: runZ(deviation, aim, lengthBits) } satisfies EndEvent);
        closed = true;
        controller.close();
      };
      deps.waitUntil(
        loop().catch(() => {
          // A failure mid-run keeps what was made. The run counts as abandoned.
          closed = true;
          return save('abandoned');
        }),
      );
    },
    cancel() {
      leave();
    },
  });
  request.signal.addEventListener('abort', leave);

  return new Response(stream, {
    status: 201,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      // no-transform keeps Cloudflare from compressing or buffering the stream.
      'Cache-Control': 'no-store, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}

interface RunRow {
  id: string;
  kind: Kind;
  aim: Aim;
  source: Source;
  length_bits: number;
  n: number;
  deviation: number;
  z: number;
  status: RunStatus;
  created_at: string;
  started_ms: number;
  bits: number[] | ArrayBuffer | null;
}

/** A row still marked running well past its planned end lost its connection and counts as abandoned. */
export function effectiveStatus(row: Pick<RunRow, 'status' | 'started_ms' | 'length_bits'>, now: number): RunStatus {
  if (row.status !== 'running') return row.status;
  const plannedEnd = row.started_ms + (row.length_bits * 1000) / BITS_PER_SECOND;
  return now > plannedEnd + STALE_AFTER_MS ? 'abandoned' : 'running';
}

/** GET /api/runs/:id. The run's result and every one of its bits. */
export async function getRun(runId: string, db: D1Database, clock: Clock = realClock): Promise<Response> {
  if (!RUN_ID_PATTERN.test(runId)) return error(404, 'not_found', 'No run with this id.');
  const row = await db
    .prepare(
      `SELECT id, kind, aim, source, length_bits, n, deviation, z, status, created_at, started_ms, bits
       FROM runs WHERE id = ?`,
    )
    .bind(runId)
    .first<RunRow>();
  if (!row) return error(404, 'not_found', 'No run with this id.');
  const packed = row.bits instanceof ArrayBuffer ? new Uint8Array(row.bits) : (row.bits ?? []);
  const result: RunResult = {
    runId: row.id,
    kind: row.kind,
    aim: row.aim,
    source: row.source,
    lengthBits: row.length_bits,
    n: row.n,
    deviation: row.deviation,
    z: row.z,
    status: effectiveStatus(row, clock.now()),
    createdAt: row.created_at,
    bits: bitString(unpackBits(packed, row.n)),
  };
  return json(result);
}
