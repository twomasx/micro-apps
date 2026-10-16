import type { CompareResponse } from './compare.ts';
import { passHeaders } from './pass-state.ts';
import type { ProductId } from './products.ts';
import type { Report } from './report.ts';
import type { Answers, AxisScore, Flag } from './scoring.ts';

export interface CreatedResult {
  id: string;
  version: string;
  type: string;
  scores: AxisScore[];
  flags: Flag[];
  deleteToken: string;
}

export interface PublicResult {
  id: string;
  version: string;
  type: string;
  scores: AxisScore[];
  flags: Flag[];
  createdAt: string;
  summary: string | null;
  unlocked: boolean;
}

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
  // With an all-app pass, the server unlocks every report. Without one, the request is unchanged.
  const extra = await passHeaders();
  const withPass =
    Object.keys(extra).length === 0 ? init : { ...init, headers: { ...(init?.headers as Record<string, string>), ...extra } };
  const response = await fetch(apiUrl(path), withPass);
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

export async function createResult(version: string, answers: Answers): Promise<CreatedResult> {
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

/** The paid report. Throws an ApiError with status 402 when it is not unlocked. */
export async function fetchReport(id: string, sessionId: string | null = null): Promise<Report> {
  const query = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : '';
  const response = await request(`results/${encodeURIComponent(id)}/report${query}`);
  return (await response.json()) as Report;
}

/** Starts a Stripe Checkout and returns the URL to send the buyer to. */
export async function startCheckout(
  product: ProductId,
  resultId: string,
  partnerResultId?: string,
): Promise<string> {
  const response = await request('checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product, resultId, partnerResultId }),
  });
  return ((await response.json()) as { url: string }).url;
}

/** The comparison of two results. The couple report comes with it once it is unlocked. */
export async function fetchCompare(
  a: string,
  b: string,
  sessionId: string | null = null,
): Promise<CompareResponse> {
  const query = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : '';
  const response = await request(
    `compare/${encodeURIComponent(a)}/${encodeURIComponent(b)}${query}`,
  );
  return (await response.json()) as CompareResponse;
}
