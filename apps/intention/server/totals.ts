import { KINDS, type Kind } from '../src/lib/protocol.ts';
import { aimSign, stoufferFromSum, type Aim } from '../src/lib/scoring.ts';
import type { GlobalAnswer, Group, HourAnswer } from '../src/lib/totals-types.ts';
import { error } from './http.ts';
import { effectiveStatus } from './runs.ts';

/** The global numbers change slowly. Cached for 5 minutes. */
export const GLOBAL_MAX_AGE = 300;
/** Intention Hour lasts 10 minutes, so its numbers are cached for 1 minute. */
export const HOUR_MAX_AGE = 60;
/** The chart never sends more points than this; long histories are thinned evenly. */
export const CHART_POINTS = 600;
/** Recent Intention Hours listed one by one. */
const RECENT_EVENTS = 14;

export interface TotalsRow {
  kind: Kind;
  source: string;
  aim: Aim;
  n: number;
  deviation: number;
  z: number;
  status: 'running' | 'complete' | 'abandoned';
  started_ms: number;
  length_bits: number;
  hour_event: string | null;
  device_id: string;
}

const SELECT = `SELECT kind, source, aim, n, deviation, z, status, started_ms, length_bits, hour_event, device_id FROM runs`;

class Tally {
  runs = 0;
  bits = 0;
  sumZ = 0;
  abandoned = 0;
  readonly devices = new Set<string>();

  add(row: TotalsRow, abandoned: boolean): void {
    this.runs += 1;
    this.bits += row.n;
    this.sumZ += row.z;
    if (abandoned) this.abandoned += 1;
    this.devices.add(row.device_id);
  }

  group(): Group {
    return {
      runs: this.runs,
      people: this.devices.size,
      bits: this.bits,
      combinedZ: stoufferFromSum(this.sumZ, this.runs),
      abandoned: this.abandoned,
      abandonedShare: this.runs > 0 ? this.abandoned / this.runs : 0,
    };
  }
}

const tallyIn = <K extends string>(map: Map<K, Tally>, key: K): Tally => {
  let tally = map.get(key);
  if (!tally) {
    tally = new Tally();
    map.set(key, tally);
  }
  return tally;
};

const groups = <K extends string>(map: Map<K, Tally>) =>
  Object.fromEntries([...map].map(([key, tally]) => [key, tally.group()])) as Record<K, Group>;

/**
 * Every finished run, combined. Runs still in progress wait until they end. Runs that lost their
 * connection without a goodbye count as abandoned, with the bits the server saved (none).
 * Rows must come in start order, for the chart.
 */
export function summarize(rows: readonly TotalsRow[], now: number): Omit<GlobalAnswer, 'generatedAt' | 'kind'> {
  const all = new Tally();
  const bySource = new Map<string, Tally>();
  const byKind = new Map<string, Tally>();
  const byWhen = new Map<'hour' | 'anytime', Tally>([
    ['hour', new Tally()],
    ['anytime', new Tally()],
  ]);
  let inProgress = 0;
  const chartBits: number[] = [0];
  const chartDeviation: number[] = [0];
  let bits = 0;
  let toward = 0;

  for (const row of rows) {
    const status = effectiveStatus(row, now);
    if (status === 'running') {
      inProgress += 1;
      continue;
    }
    const abandoned = status === 'abandoned';
    all.add(row, abandoned);
    tallyIn(bySource, row.source).add(row, abandoned);
    tallyIn(byKind, row.kind).add(row, abandoned);
    tallyIn(byWhen, row.hour_event ? 'hour' : 'anytime').add(row, abandoned);
    if (row.n > 0) {
      // The running deviation toward each run's own aim, over every bit ever made.
      bits += row.n;
      toward += row.deviation === 0 ? 0 : row.deviation * aimSign(row.aim);
      chartBits.push(bits);
      chartDeviation.push(toward);
    }
  }

  return {
    totals: all.group(),
    bySource: groups(bySource),
    byKind: groups(byKind),
    byWhen: groups(byWhen),
    inProgress,
    chart: thin(chartBits, chartDeviation),
  };
}

/** Keeps at most CHART_POINTS points, evenly spread, always with the first and the last. */
export function thin(bits: number[], deviation: number[]): { bits: number[]; deviation: number[] } {
  if (bits.length <= CHART_POINTS) return { bits, deviation };
  const out = { bits: [] as number[], deviation: [] as number[] };
  const step = (bits.length - 1) / (CHART_POINTS - 1);
  for (let i = 0; i < CHART_POINTS; i++) {
    const at = Math.round(i * step);
    out.bits.push(bits[at]!);
    out.deviation.push(deviation[at]!);
  }
  return out;
}

/**
 * Serves a totals answer from Cloudflare's edge cache, building it at most once per cache period in each data
 * center, so a busy page does not read every run for every visitor. The key is a fixed path (plus the kind), so
 * extra query parameters cannot skip the cache.
 */
export async function edgeCached(
  request: Request,
  cache: Cache | undefined,
  keyPath: string,
  build: () => Promise<Response>,
): Promise<Response> {
  const key = new Request(new URL(keyPath, request.url).toString());
  const hit = await cache?.match(key);
  if (hit) return hit;
  const response = await build();
  if (response.ok) await cache?.put(key, response.clone());
  return response;
}

const cached = (data: unknown, maxAge: number) =>
  Response.json(data, { headers: { 'Cache-Control': `public, max-age=${maxAge}` } });

/** GET /api/global?kind=all|tug. Every run ever, combined. */
export async function getGlobal(url: URL, db: D1Database, now = Date.now()): Promise<Response> {
  const kindParam = url.searchParams.get('kind') ?? 'all';
  if (kindParam !== 'all' && !KINDS.includes(kindParam as Kind)) {
    return error(400, 'unknown_kind', `Send kind: all, ${KINDS.join(', ')}.`);
  }
  const query =
    kindParam === 'all'
      ? db.prepare(`${SELECT} ORDER BY started_ms`)
      : db.prepare(`${SELECT} WHERE kind = ? ORDER BY started_ms`).bind(kindParam);
  const { results } = await query.all<TotalsRow>();
  const answer: GlobalAnswer = {
    generatedAt: new Date(now).toISOString(),
    kind: kindParam as GlobalAnswer['kind'],
    ...summarize(results, now),
  };
  return cached(answer, GLOBAL_MAX_AGE);
}

/** GET /api/hour. Every Intention Hour combined, and the recent ones one by one. */
export async function getHour(db: D1Database, now = Date.now()): Promise<Response> {
  const { results } = await db
    .prepare(`${SELECT} WHERE hour_event IS NOT NULL ORDER BY started_ms`)
    .all<TotalsRow>();
  const all = new Tally();
  const events = new Map<string, Tally>();
  for (const row of results) {
    const status = effectiveStatus(row, now);
    if (status === 'running') continue;
    all.add(row, status === 'abandoned');
    tallyIn(events, row.hour_event!).add(row, status === 'abandoned');
  }
  const answer: HourAnswer = {
    generatedAt: new Date(now).toISOString(),
    all: all.group(),
    events: [...events]
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .slice(0, RECENT_EVENTS)
      .map(([key, tally]) => ({ key, ...tally.group() })),
  };
  return cached(answer, HOUR_MAX_AGE);
}
