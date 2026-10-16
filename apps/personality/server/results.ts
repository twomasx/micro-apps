import type { PaymentsMode } from '@micro/payments/settings';
import { getQuestions } from '../src/lib/questions.ts';
import { score, ScoringError, type Answers, type AxisScore, type Flag } from '../src/lib/scoring.ts';
import { typeSummary } from './content.ts';
import { error, json, noContent } from './http.ts';
import { randomId, randomToken, RESULT_ID_PATTERN, sha256Hex } from './ids.ts';

// 40 answers are well under 1 KB of JSON.
const MAX_BODY_CHARS = 10_000;

export interface ResultRow {
  id: string;
  version: string;
  scores: string;
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

/** True when a paid purchase covers the full report for this result. */
export async function isReportUnlocked(db: D1Database, resultId: string, mode: PaymentsMode): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT 1 FROM purchases
       WHERE result_id = ? AND product IN ('report', 'both') AND status = 'paid' AND mode = ?
       LIMIT 1`,
    )
    .bind(resultId, mode)
    .first();
  return row !== null;
}

/** True when a paid purchase covers the couple report for this pair, bought from either side. */
export async function isCoupleUnlocked(db: D1Database, a: string, b: string, mode: PaymentsMode): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT 1 FROM purchases
       WHERE product IN ('couple', 'both') AND status = 'paid' AND mode = ?3
         AND ((result_id = ?1 AND partner_result_id = ?2) OR (result_id = ?2 AND partner_result_id = ?1))
       LIMIT 1`,
    )
    .bind(a, b, mode)
    .first();
  return row !== null;
}

/** POST /api/results */
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

  const questions = getQuestions(body.version);
  if (!questions) {
    return error(400, 'unknown_version', `Unknown test version ${body.version}.`);
  }

  // score() checks every value, so the cast only tells TypeScript what we expect.
  const answers = body.answers as Answers;
  let result;
  try {
    result = score(questions, answers);
  } catch (cause) {
    if (cause instanceof ScoringError) {
      return error(400, 'invalid_answers', cause.message);
    }
    throw cause;
  }

  const id = randomId();
  const deleteToken = randomToken();
  // Store answers in question order, whatever order the client sent them in.
  const stored = Object.fromEntries(questions.items.map((item) => [item.id, answers[item.id]]));

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

  return json(
    {
      id,
      version: result.version,
      type: result.type,
      scores: result.scores,
      flags: result.flags,
      deleteToken,
    },
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

/** GET /api/results/:id. Never returns the raw answers. */
export async function getResult(
  id: string,
  db: D1Database,
  mode: PaymentsMode,
  hasPass: () => Promise<boolean> = async () => false,
): Promise<Response> {
  const row = await findResult(db, id);
  if (!row) return notFound();

  return json({
    id: row.id,
    version: row.version,
    type: row.type,
    scores: JSON.parse(row.scores) as AxisScore[],
    flags: JSON.parse(row.flags) as Flag[],
    createdAt: row.created_at,
    summary: typeSummary(row.type),
    unlocked: (await isReportUnlocked(db, row.id, mode)) || (await hasPass()),
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
