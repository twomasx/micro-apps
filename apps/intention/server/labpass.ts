import { hashCode, normalizeCode } from '@micro/payments/unlock-codes';

/** Requests carry these headers. The device id is random and means nothing outside this app. */
export const DEVICE_HEADER = 'X-Device-Id';
export const UNLOCK_HEADER = 'X-Unlock-Code';

const DEVICE_ID_PATTERN = /^[a-z0-9]{12,64}$/;

export function deviceFrom(request: Request): string | null {
  const id = request.headers.get(DEVICE_HEADER);
  return id && DEVICE_ID_PATTERN.test(id) ? id : null;
}

/** True when the request carries the unlock code of a paid Lab Pass. */
export async function hasLabPass(request: Request, db: D1Database): Promise<boolean> {
  return isPaidCode(request.headers.get(UNLOCK_HEADER), db);
}

export async function isPaidCode(input: string | null, db: D1Database): Promise<boolean> {
  const code = input ? normalizeCode(input) : null;
  if (!code) return false;
  const row = await db
    .prepare(`SELECT 1 AS found FROM purchases WHERE unlock_code_hash = ? AND status = 'paid'`)
    .bind(await hashCode(code))
    .first();
  return row !== null;
}
