import { describe, expect, it } from 'vitest';
import { getProduct, priceLine } from './products.ts';

describe('priceLine', () => {
  it('shows each price from config/products.json as one-time', () => {
    expect(priceLine(getProduct('report'))).toBe('$9.99 once. No renewals.');
    expect(priceLine(getProduct('couple'))).toBe('$7.99 once. No renewals.');
    expect(priceLine(getProduct('both'))).toBe('$14.99 once. No renewals.');
  });
});
