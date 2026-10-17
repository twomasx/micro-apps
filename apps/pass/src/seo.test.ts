import { seoProblems } from '@micro/seo';
import { describe, expect, it } from 'vitest';
import { PAGES, PRIVATE_ROUTES } from './seo';

describe('search and share tags', () => {
  it('every title and description fits and follows the writing rules', () => {
    expect(seoProblems(Object.values(PAGES))).toEqual([]);
  });

  it('never types a price: the price lives in config/products.json', () => {
    for (const page of Object.values(PAGES)) expect(`${page.title} ${page.description}`).not.toMatch(/\$\d/);
  });

  it('keeps the payment return and the code page out of search', () => {
    expect(PRIVATE_ROUTES).toEqual(expect.arrayContaining(['thanks', 'restore']));
  });
});
