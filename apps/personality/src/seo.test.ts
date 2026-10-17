import { seoProblems } from '@micro/seo';
import { describe, expect, it } from 'vitest';
import catalog from '../config/products.json';
import { PAGES, shareImageSvg } from './seo';

describe('search pages', () => {
  it('have titles under 60 characters, descriptions under 155, no repeats and no banned words', () => {
    expect(seoProblems(Object.values(PAGES))).toEqual([]);
  });

  it('price every report from config/products.json, with the free result at 0, and no ratings', () => {
    const data = JSON.stringify(PAGES.intro.jsonLd);
    for (const product of catalog.products) {
      expect(data).toContain(`"price":"${(product.amount / 100).toFixed(2)}"`);
    }
    expect(data).toContain('"price":"0"');
    expect(data).toContain('"applicationCategory":"LifestyleApplication"');
    expect(data).not.toMatch(/aggregateRating|"review"/i);
  });

  it('never name a trademarked test in tags, structured data or the share image', () => {
    const everything = JSON.stringify(PAGES) + shareImageSvg();
    expect(everything).not.toMatch(/mbti|myers|briggs|16personalities/i);
  });
});
