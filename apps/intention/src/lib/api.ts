import type { MeAnswer } from './me-types.ts';
import type { GlobalAnswer, HourAnswer } from './totals-types.ts';
import { pass, passHeaders } from './pass-state.ts';

/** Calls to this app's functions. All five apps share one domain, so paths start from the base. */
export function apiUrl(path: string): string {
  return `${import.meta.env.BASE_URL}api/${path}`;
}

export class ApiError extends Error {
  override name = 'ApiError';
  constructor(
    readonly status: number,
    readonly code: string | null,
  ) {
    super(`Request failed with status ${status}${code ? ` (${code})` : ''}`);
  }
}

export async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), init);
  if (!response.ok) {
    const answer = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(response.status, answer?.error ?? null);
  }
  return (await response.json()) as T;
}

/** Cached by the server for 5 minutes, so this uses the browser's cache. */
export function fetchGlobal(): Promise<GlobalAnswer> {
  return getJson<GlobalAnswer>('global');
}

/** Cached by the server for 1 minute. */
export function fetchHour(): Promise<HourAnswer> {
  return getJson<HourAnswer>('hour');
}

/** Headers that say which device is asking, and its Lab Pass code if it has one. */
function meHeaders(deviceId: string, unlockCode: string | null): HeadersInit {
  return { ...passHeaders(deviceId), 'X-Device-Id': deviceId, ...(unlockCode ? { 'X-Unlock-Code': unlockCode } : {}) };
}

export function fetchMe(deviceId: string, unlockCode: string | null): Promise<MeAnswer> {
  return getJson<MeAnswer>('me', { cache: 'no-store', headers: meHeaders(deviceId, unlockCode) });
}

/** Every run with every bit, as a CSV file. Lab Pass only. */
export async function fetchMeCsv(deviceId: string, unlockCode: string | null): Promise<Blob> {
  const response = await fetch(apiUrl('me/csv'), { cache: 'no-store', headers: meHeaders(deviceId, unlockCode) });
  if (!response.ok) throw new ApiError(response.status, null);
  return response.blob();
}

/** Starts a Stripe checkout for Lab Pass. Returns the URL of Stripe's page. */
export async function startCheckout(): Promise<string> {
  const { url } = await getJson<{ url: string }>('checkout', {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product: 'labpass' }),
  });
  return url;
}

export type PurchaseAnswer = { paid: true; code: string } | { paid: false };

/** For the page Stripe sends the buyer back to. */
export function fetchPurchase(sessionId: string): Promise<PurchaseAnswer> {
  return getJson<PurchaseAnswer>(`purchase/${encodeURIComponent(sessionId)}`, { cache: 'no-store' });
}

/** Asks the server about an unlock code, with this device's anonymous id: a code works on up to 5 devices. */
async function askCode(code: string): Promise<{ valid: boolean; status?: string }> {
  return getJson<{ valid: boolean; status?: string }>(`unlock/${encodeURIComponent(code)}`, {
    cache: 'no-store',
    headers: { 'X-Device-Id': await pass.deviceId() },
  });
}

export async function checkCode(code: string): Promise<boolean> {
  return (await askCode(code)).valid === true;
}

/** For the restore page, which says when a code is already in use on 5 devices. */
export async function checkCodeForRestore(code: string): Promise<boolean | 'device_limit'> {
  const answer = await askCode(code);
  if (answer.valid === true) return true;
  return answer.status === 'device_limit' ? 'device_limit' : false;
}
