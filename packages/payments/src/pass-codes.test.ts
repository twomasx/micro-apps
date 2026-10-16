import { describe, expect, it } from 'vitest';
import { encodePassCode, formatPassCode, normalizePassCode, PASS_ALPHABET, passCodeFor } from './pass-codes';
import { normalizeCode } from './unlock-codes';

const SECRET = 'p'.repeat(40);

describe('pass codes', () => {
  it('use no look-alike characters', () => {
    for (const character of '01ILOU') expect(PASS_ALPHABET).not.toContain(character);
    expect(PASS_ALPHABET).toHaveLength(30);
  });

  it('are 16 characters, the same for the same session, different for sessions, generations and secrets', async () => {
    const code = await passCodeFor(SECRET, 'cs_test_a');
    expect(code).toMatch(/^[2-9A-HJKMNP-TV-Z]{16}$/);
    expect(await passCodeFor(SECRET, 'cs_test_a')).toBe(code);
    expect(await passCodeFor(SECRET, 'cs_test_b')).not.toBe(code);
    expect(await passCodeFor(SECRET, 'cs_test_a', 1)).not.toBe(code);
    expect(await passCodeFor(`${SECRET}x`, 'cs_test_a')).not.toBe(code);
  });

  it('accept any case, with or without dashes and spaces', async () => {
    const code = await passCodeFor(SECRET, 'cs_test_a');
    const typed = ` ${formatPassCode(code).toLowerCase()} `;
    expect(normalizePassCode(typed)).toBe(code);
    expect(formatPassCode(code)).toMatch(/^.{4}-.{4}-.{4}-.{4}$/);
  });

  it('refuse wrong lengths and characters outside the alphabet', () => {
    expect(normalizePassCode('K7QM-2XRP-9VTD-4HN')).toBeNull();
    expect(normalizePassCode('K7QM-2XRP-9VTD-4HN0')).toBeNull();
    expect(normalizePassCode('K7QM-2XRP-9VTD-4HNO')).toBeNull();
    expect(normalizePassCode('')).toBeNull();
  });

  it('read as unchanged by the unlock code check, so one restore box takes both', async () => {
    const code = await passCodeFor(SECRET, 'cs_test_a');
    expect(normalizeCode(code)).toBe(code);
  });

  it('spread over the whole alphabet', () => {
    expect(encodePassCode(new Uint8Array(16))).toBe('2'.repeat(16));
    const seen = new Set(encodePassCode(new Uint8Array(16).fill(255)) + encodePassCode(crypto.getRandomValues(new Uint8Array(16))));
    expect(seen.size).toBeGreaterThan(5);
  });
});
