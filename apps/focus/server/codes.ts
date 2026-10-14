import { encodeCode, normalizeCode } from '../src/lib/unlock-code.ts';

const encoder = new TextEncoder();

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * The unlock code for a paid Stripe session: an HMAC of the session ID with UNLOCK_CODE_SECRET.
 * The same session always gives the same code, so the success page can show it again after a
 * reload while the database keeps only its hash.
 */
export async function unlockCodeFor(secret: string, sessionId: string): Promise<string> {
  if (secret.length < 32) throw new Error('UNLOCK_CODE_SECRET must be at least 32 characters');
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(sessionId)));
  return encodeCode(signature.subarray(0, 10));
}

/** What the database stores in place of the code. `code` must already be normalized. */
export async function hashCode(code: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(code));
  return toHex(new Uint8Array(digest));
}

export { normalizeCode };
