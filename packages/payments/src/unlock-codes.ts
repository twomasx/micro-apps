/**
 * Unlock codes: what a buyer saves to unlock an app on another device. No accounts.
 * Used by the apps (to check what was typed) and by their servers (to make the code).
 * Import from '@micro/payments/unlock-codes' so the browser bundle never pulls in Stripe.
 *
 * A code is an HMAC of the Stripe session ID with the app's UNLOCK_CODE_SECRET, written as
 * 16 characters of Crockford's base 32 (80 bits) and shown in groups of four:
 * 7K3M-Q9TD-2XWB-HC4R. No I, L, O or U, so it is hard to misread when typed.
 * The same session always gives the same code, so a success page can show it again after a
 * reload while the database keeps only its SHA-256 hash.
 */
export const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const CODE_LENGTH = 16;
/** UNLOCK_CODE_SECRET must be at least this long. */
export const MIN_SECRET_LENGTH = 32;

const PATTERN = new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`);
const encoder = new TextEncoder();

/** The code as typed, made comparable: upper case, no spaces or dashes, look-alike letters read as digits. */
export function normalizeCode(input: string): string | null {
  const code = input
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
  return PATTERN.test(code) ? code : null;
}

/** 7K3MQ9TD2XWBHC4R becomes 7K3M-Q9TD-2XWB-HC4R. */
export function formatCode(code: string): string {
  return code.match(/.{1,4}/g)?.join('-') ?? code;
}

/** Turns bytes into code characters, 5 bits per character. */
export function encodeCode(bytes: Uint8Array): string {
  let code = '';
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5 && code.length < CODE_LENGTH) {
      bits -= 5;
      code += CODE_ALPHABET[(buffer >> bits) & 31];
    }
    buffer &= (1 << bits) - 1;
  }
  if (code.length < CODE_LENGTH) throw new Error('Not enough bytes for an unlock code');
  return code;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** The HMAC-SHA-256 of `message` with `secret`. Server only. */
export async function hmac(secret: string, message: string): Promise<Uint8Array> {
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`The code secret must be at least ${MIN_SECRET_LENGTH} characters`);
  }
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(message)));
}

/**
 * The unlock code for a paid Stripe session. Server only: it needs the secret.
 * `generation` goes up by one each time a leaked code is replaced (scripts/reissue-code.ts).
 * Generation 0 is the code every buyer got first, so codes sold before reissuing existed still work.
 */
export async function unlockCodeFor(secret: string, sessionId: string, generation = 0): Promise<string> {
  const message = generation === 0 ? sessionId : `${sessionId}:${generation}`;
  return encodeCode((await hmac(secret, message)).subarray(0, 10));
}

/** What the database stores in place of the code. `code` must already be normalized. */
export async function hashCode(code: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(code));
  return toHex(new Uint8Array(digest));
}
