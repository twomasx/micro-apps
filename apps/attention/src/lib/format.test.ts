import { describe, expect, it } from 'vitest';
import { clock } from './format';

describe('formatting', () => {
  it('shows minutes and seconds', () => {
    expect(clock(22)).toBe('0:22');
    expect(clock(65)).toBe('1:05');
    expect(clock(600)).toBe('10:00');
    expect(clock(21.6)).toBe('0:22');
  });
});
