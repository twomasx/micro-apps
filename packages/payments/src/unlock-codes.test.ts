import { describe, expect, it } from 'vitest';
import { encodeCode, formatCode, hashCode, normalizeCode, unlockCodeFor } from './unlock-codes';

const SECRET = 'a'.repeat(32);

describe('normalizeCode', () => {
  it('accepts a code typed with lower case, spaces and dashes', () => {
    expect(normalizeCode(' 7k3m-q9td 2xwb-hc4r ')).toBe('7K3MQ9TD2XWBHC4R');
  });

  it('reads O as 0 and I or L as 1', () => {
    expect(normalizeCode('O0IL-0000-0000-0000')).toBe('0011000000000000');
  });

  it('refuses the wrong length and letters outside the alphabet', () => {
    expect(normalizeCode('7K3M-Q9TD-2XWB-HC4')).toBeNull();
    expect(normalizeCode('7K3M-Q9TD-2XWB-HC4RR')).toBeNull();
    expect(normalizeCode('7K3M-Q9TD-2XWB-HC4U')).toBeNull();
    expect(normalizeCode('')).toBeNull();
  });
});

describe('formatCode', () => {
  it('splits a code into groups of four', () => {
    expect(formatCode('7K3MQ9TD2XWBHC4R')).toBe('7K3M-Q9TD-2XWB-HC4R');
  });
});

describe('encodeCode', () => {
  it('turns 10 bytes into 16 characters, 5 bits each', () => {
    expect(encodeCode(new Uint8Array(10))).toBe('0'.repeat(16));
    expect(encodeCode(new Uint8Array(10).fill(255))).toBe('Z'.repeat(16));
  });

  it('refuses too few bytes', () => {
    expect(() => encodeCode(new Uint8Array(9))).toThrow();
  });
});

describe('unlockCodeFor', () => {
  it('is 16 characters, the same for the same session, different between sessions and secrets', async () => {
    const a = await unlockCodeFor(SECRET, 'cs_test_a');
    expect(normalizeCode(a)).toBe(a);
    expect(await unlockCodeFor(SECRET, 'cs_test_a')).toBe(a);
    expect(await unlockCodeFor(SECRET, 'cs_test_b')).not.toBe(a);
    expect(await unlockCodeFor(`${SECRET}x`, 'cs_test_a')).not.toBe(a);
  });

  it('refuses a short secret', async () => {
    await expect(unlockCodeFor('short', 'cs_test_a')).rejects.toThrow();
  });
});

describe('hashCode', () => {
  it('is the SHA-256 hex of the code', async () => {
    expect(await hashCode('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});
