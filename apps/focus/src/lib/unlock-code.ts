/**
 * The unlock code a buyer saves to unlock Focus on another device.
 * Shared by the app and the server. The server makes the code; see server/codes.ts.
 *
 * 16 characters from Crockford's base 32 (80 bits), shown in groups of four:
 * 7K3M-Q9TD-2XWB-HC4R. No I, L, O or U, so it is hard to misread when typed.
 */
export const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const CODE_LENGTH = 16;

const PATTERN = new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`);

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
