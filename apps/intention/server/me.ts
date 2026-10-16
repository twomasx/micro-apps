import type { MeAnswer, MeRun } from '../src/lib/me-types.ts';
import { stoufferFromSum, aimSign, type Aim } from '../src/lib/scoring.ts';
import { bitString, unpackBits } from './bits.ts';
import { error, json } from './http.ts';
import { deviceFrom, hasLabPass } from './labpass.ts';
import { effectiveStatus } from './runs.ts';
import { thin } from './totals.ts';

/** Free: your last few runs. Lab Pass: every run, your lifetime total, your chart and a CSV. */
export const FREE_RUNS = 5;

interface Row {
  id: string;
  kind: MeRun['kind'];
  aim: Aim;
  source: string;
  length_bits: number;
  n: number;
  deviation: number;
  z: number;
  status: 'running' | 'complete' | 'abandoned';
  started_ms: number;
  created_at: string;
  hour_event: string | null;
}

const SELECT = `SELECT id, kind, aim, source, length_bits, n, deviation, z, status, started_ms, created_at, hour_event
  FROM runs WHERE device_id = ? ORDER BY started_ms`;

function toRun(row: Row, now: number): MeRun {
  return {
    runId: row.id,
    kind: row.kind,
    aim: row.aim,
    source: row.source,
    createdAt: row.created_at,
    lengthBits: row.length_bits,
    n: row.n,
    deviation: row.deviation,
    z: row.z,
    status: effectiveStatus(row, now),
    hourEvent: row.hour_event,
  };
}

/** Finished runs only: one in progress joins the list once it ends. */
async function finishedRuns(device: string, db: D1Database, now: number): Promise<Row[]> {
  const { results } = await db.prepare(SELECT).bind(device).all<Row>();
  return results.filter((row) => effectiveStatus(row, now) !== 'running');
}

/** GET /api/me. Your runs, newest first. With Lab Pass: all of them, your lifetime total and your chart. */
export async function getMe(request: Request, db: D1Database, now = Date.now()): Promise<Response> {
  const device = deviceFrom(request);
  if (!device) return error(400, 'invalid_device', 'Send the device id in the X-Device-Id header.');
  const [rows, full] = await Promise.all([finishedRuns(device, db, now), hasLabPass(request, db)]);
  const newestFirst = rows.map((row) => toRun(row, now)).reverse();

  let lifetime: MeAnswer['lifetime'] = null;
  let chart: MeAnswer['chart'] = null;
  if (full) {
    let sumZ = 0;
    let bits = 0;
    let toward = 0;
    const chartBits = [0];
    const chartDeviation = [0];
    for (const row of rows) {
      sumZ += row.z;
      if (row.n === 0) continue;
      bits += row.n;
      toward += row.deviation === 0 ? 0 : row.deviation * aimSign(row.aim);
      chartBits.push(bits);
      chartDeviation.push(toward);
    }
    lifetime = { runs: rows.length, combinedZ: stoufferFromSum(sumZ, rows.length), bits };
    chart = thin(chartBits, chartDeviation);
  }

  const answer: MeAnswer = {
    full,
    totalRuns: rows.length,
    runs: full ? newestFirst : newestFirst.slice(0, FREE_RUNS),
    lifetime,
    chart,
  };
  return json(answer);
}

const CSV_COLUMNS = [
  'run_id',
  'started_at',
  'kind',
  'aim',
  'source',
  'planned_bits',
  'bits_received',
  'deviation',
  'z',
  'status',
  'intention_hour',
  'bits',
] as const;

/** GET /api/me/csv. Every run with every bit, for Lab Pass. */
export async function getMeCsv(request: Request, db: D1Database, now = Date.now()): Promise<Response> {
  const device = deviceFrom(request);
  if (!device) return error(400, 'invalid_device', 'Send the device id in the X-Device-Id header.');
  if (!(await hasLabPass(request, db))) return error(403, 'lab_pass_required', 'The CSV download comes with Lab Pass.');
  const { results } = await db
    .prepare(
      `SELECT id, kind, aim, source, length_bits, n, deviation, z, status, started_ms, created_at, hour_event, bits
       FROM runs WHERE device_id = ? ORDER BY started_ms`,
    )
    .bind(device)
    .all<Row & { bits: number[] | ArrayBuffer | null }>();
  const lines = [CSV_COLUMNS.join(',')];
  for (const row of results) {
    const status = effectiveStatus(row, now);
    if (status === 'running') continue;
    const packed = row.bits instanceof ArrayBuffer ? new Uint8Array(row.bits) : (row.bits ?? []);
    // Every value is a plain id, number, date or word: none can hold a comma or a quote.
    lines.push(
      [
        row.id,
        row.created_at,
        row.kind,
        row.aim,
        row.source,
        row.length_bits,
        row.n,
        row.deviation,
        row.z.toFixed(6),
        status,
        row.hour_event ?? '',
        bitString(unpackBits(packed, row.n)),
      ].join(','),
    );
  }
  return new Response(`${lines.join('\r\n')}\r\n`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="intention-runs.csv"',
      'Cache-Control': 'no-store',
    },
  });
}
