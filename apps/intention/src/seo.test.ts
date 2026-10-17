import { seoProblems } from '@micro/seo';
import { describe, expect, it } from 'vitest';
import catalog from '../config/products.json';
import { PAGES, shareImageSvg } from './seo';

describe('search pages', () => {
  it('have titles under 60 characters, descriptions under 155, no repeats and no banned words', () => {
    expect(seoProblems(Object.values(PAGES))).toEqual([]);
  });

  it('price Lab Pass from config/products.json, with the free tier at 0, and no ratings', () => {
    const data = JSON.stringify(PAGES.tug.jsonLd);
    const product = catalog.products[0]!;
    expect(data).toContain(`"price":"${(product.amount / 100).toFixed(2)}"`);
    expect(data).toContain('"price":"0"');
    expect(data).toContain('"applicationCategory":"EducationalApplication"');
    expect(data).not.toMatch(/aggregateRating|"review"/i);
  });

  it('never say quantum, in the tags, the structured data or the share image', () => {
    const everything = JSON.stringify(PAGES) + shareImageSvg();
    expect(everything.toLowerCase()).not.toContain('quantum');
  });
});
