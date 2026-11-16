import { isPaidCode as isPaidUnlockCode, requestHasUnlock, type ServerPassOptions } from '@micro/payments/server';
import { readSettings, type PaymentsMode } from '@micro/payments/settings';
import { appConfig } from '../app.config.ts';

// The check itself lives in packages/payments (requestHasUnlock), shared with personality.
export { DEVICE_HEADER, deviceFrom, UNLOCK_HEADER } from '@micro/payments/server';

/** What deciding Lab Pass needs: this deployment's mode, and the pass service to ask about all-app passes. */
export interface LabPassAccess {
  mode: PaymentsMode;
  /** Absent in tests and local dev without a pass service. */
  pass?: ServerPassOptions;
}

export function labPassAccess(env: Env): LabPassAccess {
  const { mode, passOrigin, routerKey } = readSettings(env);
  return { mode, pass: { passOrigin, serviceKey: env.PASS_SERVICE_KEY, routerKey, app: appConfig.name } };
}

/**
 * True when the request carries the unlock code of a paid Lab Pass bought in this deployment's mode and this
 * device may use it (up to 5 devices), or an active all-app pass (checked with the pass service).
 * `deviceId` is the device the request names in its body, when it has no X-Device-Id header.
 */
export function hasLabPass(
  request: Request,
  db: D1Database,
  access: LabPassAccess,
  deviceId: string | null = null,
): Promise<boolean> {
  return requestHasUnlock(request, { db, app: appConfig.name, mode: access.mode, pass: access.pass }, deviceId);
}

/** A refunded or disputed Lab Pass no longer counts, and neither does a code already in use on 5 other devices. */
export function isPaidCode(input: string | null, db: D1Database, mode: PaymentsMode, deviceId: string): Promise<boolean> {
  return isPaidUnlockCode(input, { db, app: appConfig.name, mode }, deviceId);
}
