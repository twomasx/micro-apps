import { seoProblems } from '@micro/seo';
import { describe, expect, it } from 'vitest';
import catalog from '../config/products.json';
import { PAGES } from './seo';

describe('search pages', () => {
  it('have titles under 60 characters, descriptions under 155, no repeats and no banned words', () => {
    expect(seoProblems(Object.values(PAGES))).toEqual([]);
  });

  it('price the unlock from config/products.json, with the free tier at 0, and no ratings', () => {
    const data = JSON.stringify(PAGES.player.jsonLd);
    const product = catalog.products[0]!;
    expect(data).toContain(`"price":"${(product.amount / 100).toFixed(2)}"`);
    expect(data).toContain('"price":"0"');
    expect(data).toContain('"applicationCategory":"HealthApplication"');
    expect(data).not.toMatch(/aggregateRating|"review"/i);
  });
});
