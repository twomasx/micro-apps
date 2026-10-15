import { describe, expect, it } from 'vitest';
import { getProduct, priceLine } from './products';

describe('products', () => {
  it('sells one lifetime unlock at $6.99, said to be one-time', () => {
    const product = getProduct('lifetime');
    expect(product.amount).toBe(699);
    expect(priceLine(product)).toBe('$6.99 once. No renewals.');
  });
});
