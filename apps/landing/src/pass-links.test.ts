// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { isUsable } from './pass-links.ts';

describe('isUsable', () => {
  const now = 1_800_000_000_000;
  it('uses only an active pass checked within the last 7 days', () => {
    expect(isUsable({ code: 'X', status: 'active', lastGoodAt: now - 1000 }, now)).toBe(true);
    expect(isUsable({ code: 'X', status: 'active', lastGoodAt: now - 8 * 24 * 3600 * 1000 }, now)).toBe(false);
    expect(isUsable({ code: 'X', status: 'refunded', lastGoodAt: now }, now)).toBe(false);
    expect(isUsable(null, now)).toBe(false);
  });
});
