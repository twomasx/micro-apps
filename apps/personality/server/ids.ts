// 32 characters, so one random byte maps to one character with no bias.
// No l, o, 0 or 1: they are easy to misread in a shared link.
const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

export const RESULT_ID_LENGTH = 16;
export const RESULT_ID_PATTERN = /^[a-km-np-z2-9]{16}$/;

/** Random, unguessable id: 16 characters, 80 bits. */
export function randomId(length: number = RESULT_ID_LENGTH): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let id = '';
  for (const byte of bytes) {
    id += ALPHABET[byte & 31];
  }
  return id;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** 256-bit secret, as 64 hex characters. */
export function randomToken(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(32)));
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return toHex(new Uint8Array(digest));
}
