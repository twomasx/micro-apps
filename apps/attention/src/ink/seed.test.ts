import { describe, expect, it } from 'vitest';
import { seedFor } from './seed';

describe('brush seeds', () => {
  it('are stable per session and stretch, and differ between them', () => {
    expect(seedFor('abc', 3)).toBe(seedFor('abc', 3));
    expect(seedFor('abc', 3)).not.toBe(seedFor('abc', 4));
    expect(seedFor('abc', 3)).not.toBe(seedFor('abd', 3));
    expect(seedFor('abc', 3)).toBeGreaterThan(0);
  });
});
