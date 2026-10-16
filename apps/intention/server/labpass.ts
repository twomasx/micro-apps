import { purchaseStore, requestHasPass, type ServerPassOptions } from '@micro/payments/server';
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
 * True when the request carries the unlock code of a paid Lab Pass bought in this deployment's mode,
 * or an active all-app pass (checked with the pass service).
 */
export async function hasLabPass(request: Request, db: D1Database, access: LabPassAccess): Promise<boolean> {
  if (await isPaidCode(request.headers.get(UNLOCK_HEADER), db, access.mode)) return true;
  return access.pass ? requestHasPass(request, access.pass) : false;
}

/** A refunded or disputed Lab Pass no longer counts. */
export async function isPaidCode(input: string | null, db: D1Database, mode: PaymentsMode): Promise<boolean> {
  if (!input) return false;
  return (await purchaseStore({ db, app: appConfig.name, mode }).findByCode(input)) !== null;
}
