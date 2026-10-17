import { describe, expect, it } from 'vitest';
import {
  article,
  breadcrumbList,
  headTags,
  jsonLdScript,
  seoProblems,
  sitemapXml,
  webApplication,
  type PageSeo,
  type Site,
} from './index.ts';

const SITE: Site = { origin: 'https://polymadlabs.com', base: '/breathwork/', siteName: 'PolymadLabs' };
const PAGE: PageSeo = {
  path: 'science/',
  title: 'Breathing Techniques: What the Research Shows',
  description: 'Cyclic sighing, box breathing & 4-7-8 compared.',
  image: 'og.png',
  imageAlt: 'Breathwork',
  jsonLd: [{ '@type': 'Thing', name: '</script><b>' }],
};

describe('headTags', () => {
  const tags = headTags(SITE, PAGE);

  it('has the title, description, canonical and share tags with absolute production URLs', () => {
    expect(tags).toContain('<title>Breathing Techniques: What the Research Shows</title>');
    expect(tags).toContain('<meta name="description" content="Cyclic sighing, box breathing &amp; 4-7-8 compared." />');
    expect(tags).toContain('<link rel="canonical" href="https://polymadlabs.com/breathwork/science/" />');
    expect(tags).toContain('<meta property="og:image" content="https://polymadlabs.com/breathwork/og.png" />');
    expect(tags).toContain('<meta property="og:image:alt" content="Breathwork" />');
    expect(tags).toContain('<meta name="twitter:card" content="summary_large_image" />');
    for (const tag of ['og:title', 'og:description', 'og:url', 'og:type', 'og:site_name']) expect(tags).toContain(`property="${tag}"`);
  });

  it('writes JSON-LD that text can never break out of', () => {
    expect(tags).toContain('<script type="application/ld+json">');
    expect(jsonLdScript({ a: '</script>' })).not.toContain('</script><');
    expect(tags.match(/<\/script>/g)).toHaveLength(1);
  });
});

describe('webApplication', () => {
  it('lists the free tier at 0 and each unlock at its config price, with no ratings', () => {
    const data = webApplication({
      name: 'Breathwork',
      url: 'https://polymadlabs.com/breathwork/',
      description: 'x',
      category: 'HealthApplication',
      freeName: 'Free',
      products: [{ id: 'lifetime', name: 'Lifetime unlock', amount: 499, currency: 'usd' }],
    }) as Record<string, unknown>;
    expect(data.offers).toEqual([
      { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Lifetime unlock', price: '4.99', priceCurrency: 'USD' },
    ]);
    expect(data.operatingSystem).toBe('Any (web browser)');
    expect(JSON.stringify(data)).not.toMatch(/aggregateRating|review/i);
  });
});

describe('seoProblems', () => {
  it('is empty for good pages', () => {
    expect(seoProblems([PAGE, { path: '', title: 'Breathing Exercise Timer', description: 'Pick a technique.' }])).toEqual([]);
  });

  it('catches long titles and descriptions, repeated titles, banned words and the writing rules', () => {
    const problems = seoProblems([
      { path: '', title: 'x'.repeat(61), description: 'y'.repeat(156) },
      { path: 'a/', title: 'Same', description: 'Clinically proven calm' },
      { path: 'b/', title: 'Same', description: 'Free MBTI test!' },
      { path: 'c/', title: 'Box breathing — fast', description: 'ok' },
    ]);
    expect(problems).toEqual([
      '(home): title is 61 characters, over 60',
      '(home): description is 156 characters, over 155',
      'a/: says "clinically proven"',
      'b/: same title as a/',
      'b/: says "mbti"',
      'b/: has an em dash, en dash or exclamation mark',
      'c/: has an em dash, en dash or exclamation mark',
    ]);
  });
});

describe('sitemapXml', () => {
  it('lists each URL with its date', () => {
    expect(sitemapXml([{ loc: 'https://polymadlabs.com/breathwork/', lastmod: '2026-10-16' }])).toContain(
      '<url><loc>https://polymadlabs.com/breathwork/</loc><lastmod>2026-10-16</lastmod></url>',
    );
  });
});

describe('content page data', () => {
  it('an article names the organization as author and publisher, with both dates', () => {
    const data = article({
      headline: 'Box Breathing Timer',
      description: 'd',
      url: 'https://polymadlabs.com/breathwork/box-breathing/',
      image: 'https://polymadlabs.com/breathwork/box-breathing/og.png',
      datePublished: '2026-10-16',
      dateModified: '2026-10-16',
      publisher: { name: 'PolymadLabs', url: 'https://polymadlabs.com/', logo: 'https://polymadlabs.com/_landing/logo-512.png' },
    }) as Record<string, unknown>;
    expect(data['@type']).toBe('Article');
    expect(data.author).toEqual(data.publisher);
    expect(data).toMatchObject({ datePublished: '2026-10-16', dateModified: '2026-10-16' });
  });

  it('a breadcrumb list numbers its items from 1', () => {
    const data = breadcrumbList([
      { name: 'Breathwork', url: 'https://polymadlabs.com/breathwork/' },
      { name: 'Box breathing', url: 'https://polymadlabs.com/breathwork/box-breathing/' },
    ]) as { itemListElement: { position: number; name: string }[] };
    expect(data.itemListElement.map((item) => [item.position, item.name])).toEqual([
      [1, 'Breathwork'],
      [2, 'Box breathing'],
    ]);
  });
});
