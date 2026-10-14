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

export async function checkCode(code: string): Promise<boolean> {
  const { valid } = await getJson<{ valid: boolean }>(`unlock/${encodeURIComponent(code)}`);
  return valid === true;
}
