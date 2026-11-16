import { DEVICE_HEADER } from '@micro/payments/pass';
import { accessHeaders, pass } from './access.ts';
import type { BigFiveCompareResponse, BigFiveReport, BigFiveResultResponse } from './big-five-view.ts';
import type { CompareResponse } from './compare.ts';
import type { Report } from './report.ts';
import type { AxisScore, Flag } from './scoring.ts';

export interface CreatedResult {
  id: string;
  kind: 'type' | 'big-five';
  version: string;
  /** The four-letter type, or '' for a Big Five result. */
  type: string;
  flags: Flag[];
  deleteToken: string;
}

/** A four-letter result. */
export interface TypeResult {
  kind: 'type';
  id: string;
  version: string;
  type: string;
  scores: AxisScore[];
  flags: Flag[];
  createdAt: string;
  summary: string | null;
  /** True when this device may read the report: the Personality unlock or a pass. */
  unlocked: boolean;
}

export type PublicResult = TypeResult | BigFiveResultResponse;
export type TypeReport = Report & { kind: 'type' };
export type AnyReport = TypeReport | BigFiveReport;
export type AnyCompare = CompareResponse | BigFiveCompareResponse;

export class ApiError extends Error {
  override name = 'ApiError';
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function apiUrl(path: string): string {
  return `${import.meta.env.BASE_URL}api/${path}`;
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  // The device's unlock code or all-app pass goes with every request. The server decides what is unlocked.
  const extra = await accessHeaders();
  const withAccess =
    Object.keys(extra).length === 0 ? init : { ...init, headers: { ...(init?.headers as Record<string, string>), ...extra } };
  const response = await fetch(apiUrl(path), { cache: 'no-store', ...withAccess });
  if (response.ok) return response;

  let code = 'unknown';
  let message = `Request failed with status ${response.status}`;
  try {
    const body = (await response.json()) as { error?: unknown; message?: unknown };
    if (typeof body.error === 'string') code = body.error;
    if (typeof body.message === 'string') message = body.message;
  } catch {
    // Not a JSON error body. Keep the defaults.
  }
  throw new ApiError(response.status, code, message);
}

export async function createResult(version: string, answers: Record<string, number>): Promise<CreatedResult> {
  const response = await request('results', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ version, answers }),
  });
  return (await response.json()) as CreatedResult;
}

export async function fetchResult(id: string): Promise<PublicResult> {
  const response = await request(`results/${encodeURIComponent(id)}`);
  return (await response.json()) as PublicResult;
}

export async function deleteResult(id: string, deleteToken: string): Promise<void> {
  await request(`results/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${deleteToken}` },
  });
}

/** The paid report. Throws an ApiError with status 402 when this device has no unlock. */
export async function fetchReport(id: string): Promise<AnyReport> {
  const response = await request(`results/${encodeURIComponent(id)}/report`);
  return (await response.json()) as AnyReport;
}

/** The comparison of two results. The couple report comes with it when this device has the unlock. */
export async function fetchCompare(a: string, b: string): Promise<AnyCompare> {
  const response = await request(`compare/${encodeURIComponent(a)}/${encodeURIComponent(b)}`);
  return (await response.json()) as AnyCompare;
}

/** Starts a Stripe Checkout for the lifetime unlock and returns the URL to send the buyer to. */
export async function startCheckout(): Promise<string> {
  const response = await request('checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product: 'lifetime' }),
  });
  return ((await response.json()) as { url: string }).url;
}

export type PurchaseAnswer = { paid: true; code: string } | { paid: false; status?: string };

/** For the page Stripe sends the buyer back to. */
export async function fetchPurchase(sessionId: string): Promise<PurchaseAnswer> {
  const response = await request(`purchase/${encodeURIComponent(sessionId)}`);
  return (await response.json()) as PurchaseAnswer;
}

/** Asks the server about an unlock code, with this device's anonymous id: a code works on up to 5 devices. */
export async function checkCodeForRestore(code: string): Promise<boolean | 'device_limit'> {
  const response = await fetch(apiUrl(`unlock/${encodeURIComponent(code)}`), {
    cache: 'no-store',
    headers: { [DEVICE_HEADER]: await pass.deviceId() },
  });
  if (!response.ok) throw new ApiError(response.status, 'unknown', `Request failed with status ${response.status}`);
  const answer = (await response.json()) as { valid?: boolean; status?: string };
  if (answer.valid === true) return true;
  return answer.status === 'device_limit' ? 'device_limit' : false;
}
