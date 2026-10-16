import {
  clientAddress,
  countTry,
  error,
  isRecord,
  json,
  noteAddress,
  readJson,
  tooManyTries,
  admitDevice,
  type PaymentsContext,
  type PurchaseRow,
} from '@micro/payments/server';

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
 * For an active pass: lets this device use it in this app (up to 5 devices per app) and notes the address.
 * Returns the status to answer with.
 */
export async function admit(
  ctx: PaymentsContext,
  row: PurchaseRow | null,
  asker: { deviceId: string; app: string },
  address: string,
): Promise<PassStatus> {
  const status = statusOf(row);
  const codeHash = row?.unlock_code_hash;
  if (status !== 'active' || typeof codeHash !== 'string') return status;
  if ((await admitDevice(ctx.store.db, codeHash, asker.app, asker.deviceId)) === 'device_limit') return 'device_limit';
  await noteAddress(ctx.store.db, codeHash, await ctx.store.hashAddress(address));
  return 'active';
}

/**
 * POST /api/verify with `{ code, deviceId, app }`. Answers `{ valid, status }`.
 * Apps never read the pass database; they all ask this, wherever they are hosted.
 * `serviceKey` is PASS_SERVICE_KEY: app servers that send it may pass on the buyer's address.
 */
export async function verify(request: Request, ctx: PaymentsContext, serviceKey?: string): Promise<Response> {
  const address = clientAddress(request, serviceKey);
  const rate = await countTry(ctx.store.db, address);
  if (!rate.ok) {
    await ctx.store.log({ action: 'pass_check', result: 'rate_limited' });
    return tooManyTries(rate);
  }
  const question = await readQuestion(request);
  if (question instanceof Response) return question;

  const row = await ctx.store.findAnyByCode(question.code);
  const status = await admit(ctx, row, question, address);
  await ctx.store.log({
    action: 'pass_check',
    sessionId: row?.stripe_session_id ?? null,
    result: status,
    detail: question.app,
  });
  return json({ valid: status === 'active', status });
}
