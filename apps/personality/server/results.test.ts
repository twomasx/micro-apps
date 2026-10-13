import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import p1 from '../src/data/items.p1.json';
import { score } from '../src/lib/scoring.ts';
import { randomId, RESULT_ID_PATTERN, sha256Hex } from './ids.ts';
import { createResult, deleteResult, getResult } from './results.ts';
import { createTestDb, type TestDb } from './testing.ts';

const RIGHT_POLES = new Set(p1.axes.map((axis) => axis.right.letter));
const URL_BASE = 'http://localhost/api/results';

interface Created {
  id: string;
  version: string;
  type: string;
  scores: unknown;
  flags: string[];
  deleteToken: string;
}

interface ErrorBody {
  error: string;
  message: string;
}

function infpAnswers(): Record<string, number> {
  return Object.fromEntries(
    p1.items.map((item) => [item.id, RIGHT_POLES.has(item.pole) ? 5 : 1]),
  );
}

function post(body: unknown): Request {
  return new Request(URL_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function del(id: string, token?: string): Request {
  return new Request(`${URL_BASE}/${id}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

let testDb: TestDb;
let db: D1Database;

beforeAll(async () => {
  testDb = await createTestDb();
  db = testDb.db;
});

afterAll(async () => {
  await testDb.dispose();
});

async function create(answers: Record<string, number> = infpAnswers()): Promise<Created> {
  const response = await createResult(post({ version: 'p1', answers }), db);
  expect(response.status).toBe(201);
  return response.json<Created>();
}

async function expectError(response: Response, status: number, code: string): Promise<void> {
  expect(response.status).toBe(status);
  const body = await response.json<ErrorBody>();
  expect(body.error).toBe(code);
  expect(body.message.length).toBeGreaterThan(0);
}

async function addPurchase(resultId: string, product: string, status: string): Promise<void> {
  await db
    .prepare(
      `INSERT INTO purchases (id, stripe_session_id, product, result_id, amount_cents, currency, status, created_at)
       VALUES (?, ?, ?, ?, 999, 'usd', ?, ?)`,
    )
    .bind(randomId(), `cs_test_${randomId()}`, product, resultId, status, new Date().toISOString())
    .run();
}

describe('ids', () => {
  it('makes 16-character ids that do not repeat', () => {
    const ids = new Set(Array.from({ length: 500 }, () => randomId()));
    expect(ids.size).toBe(500);
    for (const id of ids) {
      expect(id).toMatch(RESULT_ID_PATTERN);
    }
  });
});

describe('POST /api/results', () => {
  it('scores, stores and returns the result', async () => {
    const answers = infpAnswers();
    const created = await create(answers);
    const expected = score(p1, answers);

    expect(created.id).toMatch(RESULT_ID_PATTERN);
    expect(created.version).toBe('p1');
    expect(created.type).toBe('INFP');
    expect(created.scores).toEqual(expected.scores);
    expect(created.flags).toEqual([]);
    expect(created.deleteToken).toMatch(/^[0-9a-f]{64}$/);
  });

  it('stores the raw answers and only the hash of the delete token', async () => {
    const answers = infpAnswers();
    const created = await create(answers);
    const row = await db
      .prepare('SELECT answers, delete_token_hash FROM results WHERE id = ?')
      .bind(created.id)
      .first<{ answers: string; delete_token_hash: string }>();

    expect(row).not.toBeNull();
    expect(JSON.parse(row?.answers ?? '{}')).toEqual(answers);
    expect(row?.delete_token_hash).toBe(await sha256Hex(created.deleteToken));
    expect(row?.delete_token_hash).not.toBe(created.deleteToken);
  });

  it('sets same_answers when every answer is the same', async () => {
    const created = await create(Object.fromEntries(p1.items.map((item) => [item.id, 3])));
    expect(created.type).toBe('ESTJ');
    expect(created.flags).toEqual(['same_answers']);
  });

  it('gives each result its own id', async () => {
    const first = await create();
    const second = await create();
    expect(first.id).not.toBe(second.id);
    expect(first.deleteToken).not.toBe(second.deleteToken);
  });

  it('rejects a missing answer', async () => {
    const answers = infpAnswers();
    delete answers['p1-20'];
    await expectError(await createResult(post({ version: 'p1', answers }), db), 400, 'invalid_answers');
  });

  it('rejects an answer outside 1 to 5', async () => {
    const answers = { ...infpAnswers(), 'p1-01': 6 };
    await expectError(await createResult(post({ version: 'p1', answers }), db), 400, 'invalid_answers');
  });

  it('rejects an answer for an unknown question', async () => {
    const answers = { ...infpAnswers(), 'p1-99': 3 };
    await expectError(await createResult(post({ version: 'p1', answers }), db), 400, 'invalid_answers');
  });

  it('rejects an unknown version', async () => {
    const body = { version: 'p9', answers: infpAnswers() };
    await expectError(await createResult(post(body), db), 400, 'unknown_version');
  });

  it('rejects a body that is not JSON', async () => {
    await expectError(await createResult(post('not json'), db), 400, 'invalid_json');
  });

  it('rejects a body with the wrong shape', async () => {
    for (const body of [null, [], {}, { version: 'p1' }, { version: 'p1', answers: [] }, { version: 1, answers: {} }]) {
      await expectError(await createResult(post(body), db), 400, 'invalid_body');
    }
  });

  it('rejects a very large body', async () => {
    const body = { version: 'p1', answers: infpAnswers(), padding: 'x'.repeat(20_000) };
    await expectError(await createResult(post(body), db), 413, 'too_large');
  });
});

describe('GET /api/results/:id', () => {
  it('returns the stored result without answers or the delete token', async () => {
    const created = await create();
    const response = await getResult(created.id, db);
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');

    const body = await response.json<Record<string, unknown>>();
    expect(Object.keys(body).sort()).toEqual(
      ['createdAt', 'flags', 'id', 'scores', 'summary', 'type', 'unlocked', 'version'].sort(),
    );
    expect(body.id).toBe(created.id);
    expect(body.version).toBe('p1');
    expect(body.type).toBe('INFP');
    expect(body.scores).toEqual(created.scores);
    expect(body.flags).toEqual([]);
    expect(body.summary).toContain('You prefer quiet');
    expect(body.unlocked).toBe(false);
    expect(Number.isNaN(Date.parse(String(body.createdAt)))).toBe(false);
  });

  it('returns 404 for an id that does not exist', async () => {
    await expectError(await getResult(randomId(), db), 404, 'not_found');
  });

  it('returns 404 for an id in the wrong format', async () => {
    for (const id of ['', 'abc', '1', "x' OR '1'='1", 'A'.repeat(16)]) {
      await expectError(await getResult(id, db), 404, 'not_found');
    }
  });

  it('is unlocked after a paid purchase of the report or of both', async () => {
    for (const product of ['report', 'both']) {
      const created = await create();
      await addPurchase(created.id, product, 'paid');
      const body = await (await getResult(created.id, db)).json<{ unlocked: boolean }>();
      expect(body.unlocked).toBe(true);
    }
  });

  it('is not unlocked by an unpaid purchase or by the couple report alone', async () => {
    const unpaid = await create();
    await addPurchase(unpaid.id, 'report', 'pending');
    expect((await (await getResult(unpaid.id, db)).json<{ unlocked: boolean }>()).unlocked).toBe(false);

    const couple = await create();
    await addPurchase(couple.id, 'couple', 'paid');
    expect((await (await getResult(couple.id, db)).json<{ unlocked: boolean }>()).unlocked).toBe(false);
  });
});

describe('DELETE /api/results/:id', () => {
  it('deletes the result with the right token', async () => {
    const created = await create();
    const response = await deleteResult(del(created.id, created.deleteToken), created.id, db);
    expect(response.status).toBe(204);
    await expectError(await getResult(created.id, db), 404, 'not_found');
  });

  it('refuses without a token', async () => {
    const created = await create();
    await expectError(await deleteResult(del(created.id), created.id, db), 401, 'missing_token');
    expect((await getResult(created.id, db)).status).toBe(200);
  });

  it('refuses with the wrong token', async () => {
    const created = await create();
    const other = await create();
    await expectError(
      await deleteResult(del(created.id, other.deleteToken), created.id, db),
      403,
      'wrong_token',
    );
    expect((await getResult(created.id, db)).status).toBe(200);
  });

  it('returns 404 for an id that does not exist', async () => {
    const id = randomId();
    await expectError(await deleteResult(del(id, 'a'.repeat(64)), id, db), 404, 'not_found');
  });
});
