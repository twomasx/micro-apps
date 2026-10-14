import { describe, expect, it } from 'vitest';
import catalog from '../../config/products.json';
import { getProduct, priceLine } from './products';

describe('products', () => {
  it('sells one lifetime unlock at $4.99, from config/products.json', () => {
    expect(catalog.products).toHaveLength(1);
    expect(getProduct('lifetime')).toEqual({ id: 'lifetime', name: 'Breathwork lifetime unlock', amount: 499, currency: 'usd' });
  });

  it('says every price is one-time', () => {
    expect(priceLine(getProduct('lifetime'))).toBe('$4.99 once. No renewals.');
  });
});
