import type { PaymentsMode } from '../settings';
import { DEVICE_HEADER } from '../pass-codes';
import { UNLOCK_HEADER } from '../unlock-codes';
import { admitDevice } from './guard';
import { requestHasPass, type ServerPassOptions } from './pass-check';
import { purchaseStore } from './store';

/**
 * For apps whose server sends paid content itself (personality's reports, intention's Lab Pass routes):
 * does this request carry the app's own paid unlock code, or an active all-app pass?
 * The device never decides. It sends what it has and the server checks it on every request.
 */

// The app's own unlock code, sent by the device with every request for paid content.
export { DEVICE_HEADER, UNLOCK_HEADER };

const DEVICE_ID_PATTERN = /^[a-z0-9]{12,64}$/;

export interface UnlockAccess {
  db: D1Database;
  /** The app's name, like "personality". The device cap counts per app. */
  app: string;
  /** PAYMENTS_MODE. Only purchases made in this mode count. */
  mode: PaymentsMode;
  /** The pass service to ask about all-app passes. Absent in tests and local dev without one. */
  pass?: ServerPassOptions;
}

/** The device id the request names in X-Device-Id, or null when there is none or it is malformed. */
export function deviceFrom(request: Request): string | null {
  const id = request.headers.get(DEVICE_HEADER);
  return id && DEVICE_ID_PATTERN.test(id) ? id : null;
}

/**
 * True when the code belongs to a paid purchase of this app in this mode and this device may use it.
 * A refunded or disputed purchase no longer counts, and neither does a code already in use on 5 other devices.
 */
export async function isPaidCode(
  input: string | null,
  access: Pick<UnlockAccess, 'db' | 'app' | 'mode'>,
  deviceId: string,
): Promise<boolean> {
  if (!input) return false;
  const row = await purchaseStore({ db: access.db, app: access.app, mode: access.mode }).findByCode(input);
  const codeHash = row?.unlock_code_hash;
  if (typeof codeHash !== 'string') return false;
  return (await admitDevice(access.db, codeHash, access.app, deviceId)) === 'ok';
}

/**
 * True when the request carries a paid unlock code of this app (X-Unlock-Code with X-Device-Id), or an active
 * all-app pass (checked with the pass service). `deviceId` is the device the request names in its body, for
 * routes that take it there instead of in X-Device-Id.
 */
export async function requestHasUnlock(
  request: Request,
  access: UnlockAccess,
  deviceId: string | null = null,
): Promise<boolean> {
  const device = deviceFrom(request) ?? deviceId;
  if (device && (await isPaidCode(request.headers.get(UNLOCK_HEADER), access, device))) return true;
  return access.pass ? requestHasPass(request, access.pass) : false;
}
