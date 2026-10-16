// Purchases change when the webhook lands, so no payments response is cached.
const HEADERS = { 'Cache-Control': 'no-store' };

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(data, { status, headers: { ...HEADERS, ...headers } });
}

export function error(status: number, code: string, message: string, headers: Record<string, string> = {}): Response {
  return json({ error: code, message }, status, headers);
}

// 32 characters, so one random byte maps to one character with no bias.
const ID_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

/** Random, unguessable row id: 16 characters, 80 bits. */
export function randomId(length = 16): string {
  let id = '';
  for (const byte of crypto.getRandomValues(new Uint8Array(length))) id += ID_ALPHABET[byte & 31];
  return id;
}

// Stripe Checkout session ids look like cs_test_a1B2... or cs_live_a1B2...
export const SESSION_ID_PATTERN = /^cs_[A-Za-z0-9_]{10,250}$/;

/** Reads a small JSON body. Returns the value, or an error response to send back. */
export async function readJson(request: Request, maxChars = 1_000): Promise<unknown> {
  const text = await request.text();
  if (text.length > maxChars) return error(413, 'too_large', 'The request body is too large.');
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return error(400, 'invalid_json', 'The request body must be JSON.');
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
