import { getBigFiveQuestions, scoreBigFive, type BigFiveTrait } from '../src/lib/big-five-test.ts';
import type { BigFiveResultResponse } from '../src/lib/big-five-view.ts';
import { getQuestions } from '../src/lib/questions.ts';
import { score, ScoringError, type Answers, type AxisScore, type Flag } from '../src/lib/scoring.ts';
import { kindOf } from '../src/lib/tests.ts';
import { buildBigFiveReport, traitViews } from './big-five.ts';
import { buildReport, typeSummary } from './content.ts';
import { error, json, noContent } from './http.ts';
import { randomId, randomToken, RESULT_ID_PATTERN, sha256Hex } from './ids.ts';
import type { HasUnlock } from './payments.ts';

// 100 answers are about 1.5 KB of JSON.
const MAX_BODY_CHARS = 10_000;

export interface ResultRow {
  id: string;
  version: string;
  scores: string;
  /** The four-letter type, or '' for a Big Five result. */
  type: string;
  flags: string;
  delete_token_hash: string;
  created_at: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function notFound(): Response {
  return error(404, 'not_found', 'No result with this id.');
}

/** What a scored test stores. `scores` is AxisScore[] for the type test and BigFiveTrait[] for the Big Five. */
interface Scored {
  version: string;
  type: string;
  scores: unknown;
  flags: Flag[];
  /** The question ids in order, so answers are stored in question order. */
  itemIds: string[];
}

/** Scores answers with the test their version belongs to. Throws ScoringError on bad answers. */
function scoreAnswers(version: string, answers: Answers): Scored | null {
  const kind = kindOf(version);
  if (kind === 'type') {
    const questions = getQuestions(version)!;
    const result = score(questions, answers);
    return { ...result, itemIds: questions.items.map((item) => item.id) };
  }
  if (kind === 'big-five') {
    const questions = getBigFiveQuestions(version)!;
    const result = scoreBigFive(questions, answers);
    return { version, type: '', scores: result.traits, flags: result.flags, itemIds: questions.items.map((item) => item.id) };
  }
  return null;
}

/** POST /api/results with `{ version, answers }`, for either test. */
export async function createResult(request: Request, db: D1Database): Promise<Response> {
  const text = await request.text();
  if (text.length > MAX_BODY_CHARS) {
    return error(413, 'too_large', 'The request body is too large.');
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return error(400, 'invalid_json', 'The request body must be JSON.');
  }
  if (!isRecord(body) || typeof body.version !== 'string' || !isRecord(body.answers)) {
    return error(400, 'invalid_body', 'Send { version, answers }.');
  }

  // The scoring modules check every value, so the cast only tells TypeScript what we expect.
  const answers = body.answers as Answers;
  let result: Scored | null;
  try {
    result = scoreAnswers(body.version, answers);
  } catch (cause) {
    if (cause instanceof ScoringError) {
      return error(400, 'invalid_answers', cause.message);
    }
    throw cause;
  }
  if (!result) {
    return error(400, 'unknown_version', `Unknown test version ${body.version}.`);
  }

  const id = randomId();
  const deleteToken = randomToken();
  // Store answers in question order, whatever order the client sent them in.
  const stored = Object.fromEntries(result.itemIds.map((itemId) => [itemId, answers[itemId]]));

  await db
    .prepare(
      `INSERT INTO results (id, version, answers, scores, type, flags, delete_token_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      result.version,
      JSON.stringify(stored),
      JSON.stringify(result.scores),
      result.type,
      JSON.stringify(result.flags),
      await sha256Hex(deleteToken),
      new Date().toISOString(),
    )
    .run();

  const kind = kindOf(result.version);
  return json(
    kind === 'type'
      ? { id, kind, version: result.version, type: result.type, scores: result.scores, flags: result.flags, deleteToken }
      : { id, kind, version: result.version, type: result.type, flags: result.flags, deleteToken },
    201,
  );
}

export async function findResult(db: D1Database, id: string): Promise<ResultRow | null> {
  if (!RESULT_ID_PATTERN.test(id)) return null;
  return db
    .prepare(
      `SELECT id, version, scores, type, flags, delete_token_hash, created_at
       FROM results WHERE id = ?`,
    )
    .bind(id)
    .first<ResultRow>();
}

/** GET /api/results/:id. Never returns the raw answers. A Big Five result's aspect scores are in the report only. */
export async function getResult(id: string, db: D1Database, hasUnlock: HasUnlock): Promise<Response> {
  const row = await findResult(db, id);
  if (!row) return notFound();

  const flags = JSON.parse(row.flags) as Flag[];
  const bigFive = getBigFiveQuestions(row.version);
  if (bigFive) {
    const body: BigFiveResultResponse = {
      kind: 'big-five',
      id: row.id,
      version: row.version,
      traits: traitViews(JSON.parse(row.scores) as BigFiveTrait[], bigFive),
      flags,
      createdAt: row.created_at,
      unlocked: await hasUnlock(),
    };
    return json(body);
  }

  return json({
    kind: 'type',
    id: row.id,
    version: row.version,
    type: row.type,
    scores: JSON.parse(row.scores) as AxisScore[],
    flags,
    createdAt: row.created_at,
    summary: typeSummary(row.type),
    unlocked: await hasUnlock(),
  });
}

/**
 * GET /api/results/:id/report. 402 unless the request carries this app's paid unlock code or an active pass.
 * The paid text is built only after that check.
 */
export async function getReport(id: string, db: D1Database, hasUnlock: HasUnlock): Promise<Response> {
  const row = await findResult(db, id);
  if (!row) return notFound();
  if (!(await hasUnlock())) return error(402, 'payment_required', 'The report needs the Personality unlock.');

  const bigFive = getBigFiveQuestions(row.version);
  if (bigFive) {
    return json(buildBigFiveReport({ id: row.id, createdAt: row.created_at }, JSON.parse(row.scores) as BigFiveTrait[], bigFive));
  }
  const questions = getQuestions(row.version);
  if (!questions) throw new Error(`No questions for version ${row.version}`);
  return json({
    kind: 'type',
    ...buildReport({ id: row.id, type: row.type, createdAt: row.created_at }, JSON.parse(row.scores) as AxisScore[], questions),
  });
}

/** DELETE /api/results/:id with `Authorization: Bearer <deleteToken>`. */
export async function deleteResult(request: Request, id: string, db: D1Database): Promise<Response> {
  const match = /^Bearer (.+)$/.exec(request.headers.get('Authorization') ?? '');
  const token = match?.[1];
  if (!token) {
    return error(401, 'missing_token', 'Send the delete token as a Bearer token.');
  }

  const row = await findResult(db, id);
  if (!row) return notFound();

  if ((await sha256Hex(token)) !== row.delete_token_hash) {
    return error(403, 'wrong_token', 'This delete token does not match the result.');
  }

  await db.prepare('DELETE FROM results WHERE id = ?').bind(id).run();
  return noContent();
}
