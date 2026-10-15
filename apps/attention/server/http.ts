// Purchases change when the webhook lands, so no API response is cached.
const HEADERS = { 'Cache-Control': 'no-store' };

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: HEADERS });
}

export function error(status: number, code: string, message: string): Response {
  return json({ error: code, message }, status);
}

// 32 characters, so one random byte maps to one character with no bias.
const ID_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

/** Random, unguessable row id: 16 characters, 80 bits. */
export function randomId(length = 16): string {
  let id = '';
  for (const byte of crypto.getRandomValues(new Uint8Array(length))) id += ID_ALPHABET[byte & 31];
  return id;
}
