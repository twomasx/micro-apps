import { pass } from './pass-state';

/** Calls to this app's functions. All five apps share one domain, so paths start from the base. */

export class ApiError extends Error {
  override name = 'ApiError';
  constructor(readonly status: number) {
    super(`Request failed with status ${status}`);
  }
}

function apiUrl(path: string): string {
  return `${import.meta.env.BASE_URL}api/${path}`;
}

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), { cache: 'no-store', ...init });
  if (!response.ok) throw new ApiError(response.status);
  return (await response.json()) as T;
}

/** Starts a Stripe checkout for the lifetime unlock. Returns the URL of Stripe's page. */
export async function startCheckout(): Promise<string> {
  const { url } = await getJson<{ url: string }>('checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product: 'lifetime' }),
  });
  return url;
}

export type PurchaseAnswer = { paid: true; code: string } | { paid: false };

/** For the page Stripe sends the buyer back to. */
export function fetchPurchase(sessionId: string): Promise<PurchaseAnswer> {
  return getJson<PurchaseAnswer>(`purchase/${encodeURIComponent(sessionId)}`);
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
