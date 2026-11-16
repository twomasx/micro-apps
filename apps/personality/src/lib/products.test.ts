import { describe, expect, it } from 'vitest';
import { getProduct, priceLine } from './products.ts';

describe('priceLine', () => {
  it('shows the price from config/products.json as one-time', () => {
    expect(priceLine(getProduct('lifetime'))).toBe('$9.99 once. No renewals.');
  });
});
