import { admitDevice, purchaseStore, requestHasPass, type ServerPassOptions } from '@micro/payments/server';
import { readSettings, type PaymentsMode } from '@micro/payments/settings';
import { appConfig } from '../app.config.ts';

/** Requests carry these headers. The device id is random and means nothing outside this app. */
export const DEVICE_HEADER = 'X-Device-Id';
export const UNLOCK_HEADER = 'X-Unlock-Code';

const DEVICE_ID_PATTERN = /^[a-z0-9]{12,64}$/;

export function deviceFrom(request: Request): string | null {
  const id = request.headers.get(DEVICE_HEADER);
  return id && DEVICE_ID_PATTERN.test(id) ? id : null;
}

/** What deciding Lab Pass needs: this deployment's mode, and the pass service to ask about all-app passes. */
export interface LabPassAccess {
  mode: PaymentsMode;
  /** Absent in tests and local dev without a pass service. */
  pass?: ServerPassOptions;
}

export function labPassAccess(env: Env): LabPassAccess {
  const { mode, passOrigin } = readSettings(env);
  return { mode, pass: { passOrigin, serviceKey: env.PASS_SERVICE_KEY, app: appConfig.name } };
}

/**
 * True when the request carries the unlock code of a paid Lab Pass bought in this deployment's mode and this
 * device may use it (up to 5 devices), or an active all-app pass (checked with the pass service).
 * `deviceId` is the device the request names in its body, when it has no X-Device-Id header.
 */
export async function hasLabPass(
  request: Request,
  db: D1Database,
  access: LabPassAccess,
  deviceId: string | null = null,
): Promise<boolean> {
  const device = deviceFrom(request) ?? deviceId;
  if (device && (await isPaidCode(request.headers.get(UNLOCK_HEADER), db, access.mode, device))) return true;
  return access.pass ? requestHasPass(request, access.pass) : false;
}

/** A refunded or disputed Lab Pass no longer counts, and neither does a code already in use on 5 other devices. */
export async function isPaidCode(input: string | null, db: D1Database, mode: PaymentsMode, deviceId: string): Promise<boolean> {
  if (!input) return false;
  const row = await purchaseStore({ db, app: appConfig.name, mode }).findByCode(input);
  const codeHash = row?.unlock_code_hash;
  if (typeof codeHash !== 'string') return false;
  return (await admitDevice(db, codeHash, appConfig.name, deviceId)) === 'ok';
}
