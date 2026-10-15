import { describe, expect, it } from 'vitest';
import { clock, spoken } from './format';

describe('formatting', () => {
  it('shows minutes and seconds', () => {
    expect(clock(22)).toBe('0:22');
    expect(clock(65)).toBe('1:05');
    expect(clock(600)).toBe('10:00');
    expect(clock(21.6)).toBe('0:22');
  });

  it('says durations in words', () => {
    expect(spoken(22)).toBe('22 seconds');
    expect(spoken(61)).toBe('1 minute 1 second');
    expect(spoken(600)).toBe('10 minutes');
    expect(spoken(0)).toBe('0 seconds');
  });
});
