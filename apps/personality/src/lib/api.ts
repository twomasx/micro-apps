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
  const response = await fetch(apiUrl(path), init);
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
