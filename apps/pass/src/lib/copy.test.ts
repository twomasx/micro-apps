import { describe, expect, it } from 'vitest';
import { priceLine } from './copy';

describe('copy', () => {
  it('says the price is one-time', () => {
    expect(priceLine()).toBe('$19.99 once. No renewals.');
  });
});
