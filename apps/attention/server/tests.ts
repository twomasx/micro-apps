import { SART_VERSION, SCORE_WEIGHTS, steadiness } from '../src/lib/sart-score.ts';
import { REPEATS } from '../src/lib/sart-sequence.ts';
import { error, json, randomId } from './http.ts';

/** First results needed before any comparison is shown. Fewer would give a misleading number. */
export const MIN_NORM_COUNT = 200;
const MAX_BODY_CHARS = 2_000;
/** Norms change slowly. Cached for an hour, so the database is asked at most once an hour per length. */
export const NORMS_MAX_AGE = 3600;
/** The test window is 1150 ms, so no real reaction time or spread can be longer. */
const MAX_MS = 1150;

type Length = 'quick' | 'full';

export interface TestSummary {
  version: number;
  length: Length;
  nth: number;
  commissions: number;
  omissions: number;
  anticipations: number;
  meanRt: number | null;
  sdRt: number | null;
  cv: number | null;
  score: number;
}

const isInt = (x: unknown, lo: number, hi: number): x is number =>
  typeof x === 'number' && Number.isInteger(x) && x >= lo && x <= hi;
const isNum = (x: unknown, lo: number, hi: number): x is number =>
  typeof x === 'number' && Number.isFinite(x) && x >= lo && x <= hi;

/** The score the client should have sent, worked out again from its parts (see the science page). */
function expectedScore(s: Omit<TestSummary, 'score'>): number {
  const threes = REPEATS[s.length];
  const others = REPEATS[s.length] * 8;
  return Math.round(
    SCORE_WEIGHTS.holds * (1 - s.commissions / threes) +
      SCORE_WEIGHTS.hits * (1 - s.omissions / others) +
      SCORE_WEIGHTS.steadiness * steadiness(s.cv),
  );
}

/** Checks a summary from the client. Returns it cleaned, or null if anything is off. */
export function parseSummary(raw: unknown): TestSummary | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (r.version !== SART_VERSION) return null;
  if (r.length !== 'quick' && r.length !== 'full') return null;
  const length: Length = r.length;
  const threes = REPEATS[length];
  const others = REPEATS[length] * 8;
  if (!isInt(r.nth, 1, 10_000)) return null;
  if (!isInt(r.commissions, 0, threes) || !isInt(r.omissions, 0, others)) return null;
  if (!isInt(r.anticipations, 0, 10_000)) return null;
  const meanRt = r.meanRt === null ? null : isInt(r.meanRt, 100, MAX_MS) ? r.meanRt : undefined;
  const sdRt = r.sdRt === null ? null : isInt(r.sdRt, 0, MAX_MS) ? r.sdRt : undefined;
  const cv = r.cv === null ? null : isNum(r.cv, 0, 10) ? r.cv : undefined;
  if (meanRt === undefined || sdRt === undefined || cv === undefined) return null;
  if (!isInt(r.score, 0, 100)) return null;
  const summary: Omit<TestSummary, 'score'> = { version: SART_VERSION, length, nth: r.nth, commissions: r.commissions, omissions: r.omissions, anticipations: r.anticipations, meanRt, sdRt, cv };
  // The client rounds CV to 3 places, so allow 1 point either way.
  if (Math.abs(expectedScore(summary) - r.score) > 1) return null;
  return { ...summary, score: r.score };
}

/** POST /api/tests. Stores one anonymous summary. Nothing that identifies the person or device. */
export async function recordTest(request: Request, db: D1Database, now = new Date()): Promise<Response> {
  const text = await request.text();
  if (text.length > MAX_BODY_CHARS) return error(413, 'too_large', 'The request body is too large.');
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return error(400, 'invalid_json', 'The request body must be JSON.');
  }
  const s = parseSummary(body);
  if (!s) return error(400, 'invalid_summary', 'The test summary is not valid.');
  await db
    .prepare(
      `INSERT INTO test_results (id, version, length, nth, commissions, omissions, anticipations, mean_rt, sd_rt, cv, score, created_on)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(randomId(), s.version, s.length, s.nth, s.commissions, s.omissions, s.anticipations, s.meanRt, s.sdRt, s.cv, s.score, now.toISOString().slice(0, 10))
    .run();
  return json({ ok: true }, 201);
}

export type Norms =
  | { length: Length; version: number; ready: false; count: number }
  /** `scores[s]` is how many first results scored exactly s, for s from 0 to 100. */
  | { length: Length; version: number; ready: true; count: number; scores: number[] };

/** The comparison table from first tests only. Not ready until there are 200 of them. */
export async function buildNorms(db: D1Database, length: Length): Promise<Norms> {
  const { results } = await db
    .prepare(`SELECT score, COUNT(*) AS n FROM test_results WHERE length = ? AND version = ? AND nth = 1 GROUP BY score`)
    .bind(length, SART_VERSION)
    .all<{ score: number; n: number }>();
  const scores = new Array<number>(101).fill(0);
  let count = 0;
  for (const row of results) {
    scores[row.score] = row.n;
    count += row.n;
  }
  if (count < MIN_NORM_COUNT) return { length, version: SART_VERSION, ready: false, count };
  return { length, version: SART_VERSION, ready: true, count, scores };
}

/** GET /api/norms?length=quick|full. Cached for an hour at the edge and in the browser. */
export async function getNorms(request: Request, db: D1Database, cache?: Cache): Promise<Response> {
  const length = new URL(request.url).searchParams.get('length');
  if (length !== 'quick' && length !== 'full') return error(400, 'unknown_length', 'Use length=quick or length=full.');
  const key = new Request(new URL(`/api/norms?length=${length}`, request.url).toString());
  const hit = await cache?.match(key);
  if (hit) return hit;
  const response = Response.json(await buildNorms(db, length), {
    headers: { 'Cache-Control': `public, max-age=${NORMS_MAX_AGE}` },
  });
  await cache?.put(key, response.clone());
  return response;
}
