import { hashCode } from '@micro/payments/unlock-codes';
import { error, isRecord, json, readJson, type PaymentsContext } from '@micro/payments/server';
import { deviceAndApp, statusOf } from './verify.ts';

export const TOKEN_MS = 10 * 60 * 1000;
const TOKEN_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

/** 32 random characters, 160 bits. */
export function newToken(): string {
  let token = '';
  for (const byte of crypto.getRandomValues(new Uint8Array(32))) token += TOKEN_ALPHABET[byte & 31];
  return token;
}

/**
 * POST /api/token with `{ code }`: a one-time token that carries this pass into an app with no typing.
 * The pass pages make one when a person taps "Open <app>". Single use, gone after 10 minutes.
 */
export async function createToken(request: Request, ctx: PaymentsContext, db: D1Database, now = Date.now()): Promise<Response> {
  const body = await readJson(request);
  if (body instanceof Response) return body;
  if (!isRecord(body) || typeof body.code !== 'string') return error(400, 'invalid_body', 'Send { code }.');

  const row = await ctx.store.findByCode(body.code);
  if (!row) return error(404, 'not_found', 'This pass code was not found or no longer works.');

  const token = newToken();
  await db.batch([
    // Old tokens are of no use to anyone. Keep the table small.
    db.prepare('DELETE FROM pass_tokens WHERE expires_ms < ?').bind(now - 24 * 60 * 60 * 1000),
    db
      .prepare('INSERT INTO pass_tokens (token_hash, stripe_session_id, created_ms, expires_ms) VALUES (?, ?, ?, ?)')
      .bind(await hashCode(token), row.stripe_session_id, now, now + TOKEN_MS),
  ]);
  return json({ token, expiresAt: now + TOKEN_MS }, 201);
}

/**
 * POST /api/redeem with `{ token, deviceId, app }`: the app trades the token for the pass code, once.
 * 410 when the token was used already, has expired, or never existed.
 */
export async function redeemToken(request: Request, ctx: PaymentsContext, db: D1Database, now = Date.now()): Promise<Response> {
  const body = await readJson(request);
  if (body instanceof Response) return body;
  const question = isRecord(body) ? deviceAndApp(body) : null;
  if (!isRecord(body) || typeof body.token !== 'string' || !/^[a-z0-9]{20,64}$/.test(body.token) || !question) {
    return error(400, 'invalid_body', 'Send { token, deviceId, app }.');
  }

  const used = await db
    .prepare(
      `UPDATE pass_tokens SET used_ms = ? WHERE token_hash = ? AND used_ms IS NULL AND expires_ms > ?
       RETURNING stripe_session_id`,
    )
    .bind(now, await hashCode(body.token), now)
    .first<{ stripe_session_id: string }>();
  const row = used ? await ctx.store.find(used.stripe_session_id) : null;
  const status = statusOf(row);
  await ctx.store.log({ action: 'pass_check', sessionId: row?.stripe_session_id ?? null, result: `token_${used ? status : 'gone'}`, detail: question.app });
  if (!row || status !== 'active') return error(410, 'token_gone', 'This link has been used or has expired. Enter your pass code instead.');
  return json({ code: await ctx.store.currentCode(row), valid: true, status });
}
