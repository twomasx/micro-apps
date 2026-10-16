/**
 * Pass codes: what an all-app pass buyer saves to unlock every app, on any device. No accounts.
 * Import from '@micro/payments/pass-codes' (no Stripe in it), so the apps can check what was typed.
 *
 * 16 characters from an alphabet with no 0, O, 1, I, L or U, shown in groups of four: K7QM-2XRP-9VTD-4HNC.
 * The server makes a code as an HMAC of the Stripe session id with PASS_CODE_SECRET, so it cannot be
 * guessed without the secret, the success page can show it again after a reload, and the database keeps
 * only its SHA-256 hash. A leaked code is replaced by moving to the next generation.
 * Every character is also a valid unlock code character, so an app's restore box takes either kind.
 */
import { formatCode, hmac } from './unlock-codes';

/** Request headers for app servers that check the pass themselves (personality, intention). */
export const PASS_HEADER = 'X-Pass-Code';
export const DEVICE_HEADER = 'X-Device-Id';

/** The query parameter that carries a one-time token from the pass pages into an app. */
export const PASS_TOKEN_PARAM = 'passToken';

export const PASS_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
export const PASS_CODE_LENGTH = 16;

const PATTERN = new RegExp(`^[${PASS_ALPHABET}]{${PASS_CODE_LENGTH}}$`);

/** The code as typed, made comparable: upper case, no spaces or dashes. Null when it cannot be a pass code. */
export function normalizePassCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s-]/g, '');
  return PATTERN.test(code) ? code : null;
}

/** K7QMXRP29VTD4HNC becomes K7QM-XRP2-9VTD-4HNC. */
export const formatPassCode = formatCode;

/** Turns 16 bytes into a pass code: the bytes as one number, written in base 30. */
export function encodePassCode(bytes: Uint8Array): string {
  if (bytes.length < 16) throw new Error('Not enough bytes for a pass code');
  let value = 0n;
  for (const byte of bytes.subarray(0, 16)) value = (value << 8n) | BigInt(byte);
  let code = '';
  for (let i = 0; i < PASS_CODE_LENGTH; i++) {
    code = PASS_ALPHABET[Number(value % 30n)] + code;
    value /= 30n;
  }
  return code;
}

/** The pass code of a paid pass purchase. Server only: it needs PASS_CODE_SECRET. */
export async function passCodeFor(secret: string, sessionId: string, generation = 0): Promise<string> {
  const message = generation === 0 ? `pass:${sessionId}` : `pass:${sessionId}:${generation}`;
  return encodePassCode(await hmac(secret, message));
}
