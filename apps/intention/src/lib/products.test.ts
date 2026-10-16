import { describe, expect, it } from 'vitest';
import catalog from '../../config/products.json';
import { getProduct, priceLine } from './products.ts';

describe('Lab Pass price', () => {
  it('comes from config/products.json and says it is one-time', () => {
    expect(catalog.products).toHaveLength(1);
    expect(getProduct('labpass')).toMatchObject({ amount: 499, currency: 'usd' });
    expect(priceLine()).toBe('$4.99 once. No renewals.');
  });
});
