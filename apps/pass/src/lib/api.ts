/** Calls to the pass service. All apps share one domain, so paths start from the base. */

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

function postJson<T>(path: string, body: unknown): Promise<T> {
  return getJson<T>(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

/** Starts a Stripe checkout for the pass. Returns the URL of Stripe's page. */
export async function startCheckout(): Promise<string> {
  return (await postJson<{ url: string }>('checkout', { product: 'pass' })).url;
}

export type PurchaseAnswer = { paid: true; code: string } | { paid: false; status?: string };

/** For the page Stripe sends the buyer back to. */
export function fetchPurchase(sessionId: string): Promise<PurchaseAnswer> {
  return getJson<PurchaseAnswer>(`purchase/${encodeURIComponent(sessionId)}`);
}

export interface AppLink {
  app: string;
  name: string;
  url: string;
}

export async function fetchAppLinks(): Promise<AppLink[]> {
  return (await getJson<{ apps: AppLink[] }>('links')).apps;
}

/** A one-time token for opening an app with this pass. Valid for 10 minutes, once. */
export async function createToken(code: string): Promise<string> {
  return (await postJson<{ token: string }>('token', { code })).token;
}
