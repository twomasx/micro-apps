import type { GlobalAnswer, HourAnswer } from './totals-types.ts';

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
