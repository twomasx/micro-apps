import { error, isRecord, json, readJson, type PaymentsContext, type PurchaseRow } from '@micro/payments/server';

/** What the verify API says about a pass. Only active unlocks anything. */
export type PassStatus = 'active' | 'refunded' | 'disputed' | 'unknown' | 'device_limit';

const DEVICE_ID = /^[a-z0-9]{12,64}$/;
const APP = /^[a-z][a-z0-9-]{1,31}$/;

export interface PassQuestion {
  code: string;
  deviceId: string;
  app: string;
}

/** The anonymous device id and the app name every pass question carries, or null when they are malformed. */
export function deviceAndApp(body: Record<string, unknown>): { deviceId: string; app: string } | null {
  const { deviceId, app } = body;
  if (typeof deviceId !== 'string' || !DEVICE_ID.test(deviceId) || typeof app !== 'string' || !APP.test(app)) return null;
  return { deviceId, app };
}

/** Reads `{ code, deviceId, app }`. Returns an error response for anything else. */
export async function readQuestion(request: Request): Promise<PassQuestion | Response> {
  const body = await readJson(request);
  if (body instanceof Response) return body;
  const asker = isRecord(body) ? deviceAndApp(body) : null;
  if (!isRecord(body) || typeof body.code !== 'string' || !asker) {
    return error(400, 'invalid_body', 'Send { code, deviceId, app }.');
  }
  return { code: body.code, ...asker };
}

export function statusOf(row: PurchaseRow | null): PassStatus {
  switch (row?.status) {
    case 'paid':
      return 'active';
    case 'refunded':
      return 'refunded';
    case 'disputed':
      return 'disputed';
    default:
      // No such code, or a checkout that was never paid.
      return 'unknown';
  }
}

/**
 * POST /api/verify with `{ code, deviceId, app }`. Answers `{ valid, status }`.
 * Apps never read the pass database; they all ask this, wherever they are hosted.
 */
export async function verify(request: Request, ctx: PaymentsContext): Promise<Response> {
  const question = await readQuestion(request);
  if (question instanceof Response) return question;

  const row = await ctx.store.findAnyByCode(question.code);
  const status = statusOf(row);
  await ctx.store.log({
    action: 'pass_check',
    sessionId: row?.stripe_session_id ?? null,
    result: status,
    detail: question.app,
  });
  return json({ valid: status === 'active', status });
}
