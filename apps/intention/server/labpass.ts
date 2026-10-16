import { purchaseStore } from '@micro/payments/server';
import type { PaymentsMode } from '@micro/payments/settings';
import { appConfig } from '../app.config.ts';

/** Requests carry these headers. The device id is random and means nothing outside this app. */
export const DEVICE_HEADER = 'X-Device-Id';
export const UNLOCK_HEADER = 'X-Unlock-Code';

const DEVICE_ID_PATTERN = /^[a-z0-9]{12,64}$/;

export function deviceFrom(request: Request): string | null {
  const id = request.headers.get(DEVICE_HEADER);
  return id && DEVICE_ID_PATTERN.test(id) ? id : null;
}

/** True when the request carries the unlock code of a paid Lab Pass bought in this deployment's mode. */
export async function hasLabPass(request: Request, db: D1Database, mode: PaymentsMode): Promise<boolean> {
  return isPaidCode(request.headers.get(UNLOCK_HEADER), db, mode);
}

/** A refunded or disputed Lab Pass no longer counts. */
export async function isPaidCode(input: string | null, db: D1Database, mode: PaymentsMode): Promise<boolean> {
  if (!input) return false;
  return (await purchaseStore({ db, app: appConfig.name, mode }).findByCode(input)) !== null;
}
