import { describe, expect, it } from 'vitest';
import { httpsRedirect, isPrivate, robotsTxt, sitemapIndex, withRobots } from './seo.ts';

const url = (path: string) => new URL(`https://polymadlabs.com${path}`);

describe('isPrivate', () => {
  it('is true for codes, tokens, payment returns and personal results', () => {
    for (const path of [
      '/focus/unlock',
      '/focus/unlock/',
      '/breathwork/restore/',
      '/breathwork/week/',
      '/breathwork/custom',
      '/breathwork/app',
      '/personality/r/abc123/report',
      '/personality/c/abc/def',
      '/personality/pass/?back=x',
      '/pass/thanks/?session_id=cs_test_1',
      '/pass/restore',
      '/focus/?passToken=abcdefghijkmnpqrstuvwx',
      '/intention/unlock?session_id=cs_test_1',
    ]) {
      expect(isPrivate(url(path)), path).toBe(true);
    }
  });

  it('is false for pages meant to be found', () => {
    for (const path of ['/', '/breathwork/', '/breathwork/science/', '/personality/', '/pass/', '/focus/privacy/', '/terms']) {
      expect(isPrivate(url(path)), path).toBe(false);
    }
  });
});

describe('withRobots', () => {
  const page = () => new Response('<p>hi</p>', { headers: { 'content-type': 'text/html', 'x-robots-tag': 'noindex' } });

  it('staging: noindex, nofollow on everything', () => {
    expect(withRobots(page(), url('/breathwork/'), true).headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect(withRobots(new Response('{}'), url('/breathwork/api/health'), true).headers.get('x-robots-tag')).toBe('noindex, nofollow');
  });

  it('production: noindex on private pages only, and never passes on the noindex Pages sends for pages.dev', () => {
    expect(withRobots(page(), url('/breathwork/'), false).headers.get('x-robots-tag')).toBeNull();
    expect(withRobots(page(), url('/breathwork/unlock'), false).headers.get('x-robots-tag')).toBe('noindex');
  });

  it('keeps the status and body', async () => {
    const response = withRobots(new Response('gone', { status: 404 }), url('/x'), true);
    expect(response.status).toBe(404);
    expect(await response.text()).toBe('gone');
  });
});

describe('robots.txt and the sitemap index', () => {
  it('robots.txt names the sitemap and blocks nothing itself', async () => {
    const text = await robotsTxt('https://polymadlabs.com').text();
    expect(text).toContain('Sitemap: https://polymadlabs.com/sitemap.xml');
    expect(text).not.toMatch(/Disallow/i);
  });

  it('the sitemap index lists the landing page and every live app', async () => {
    const xml = await sitemapIndex('https://polymadlabs.com', ['breathwork', 'focus']).text();
    expect(xml).toContain('<loc>https://polymadlabs.com/_landing/sitemap.xml</loc>');
    expect(xml).toContain('<loc>https://polymadlabs.com/breathwork/sitemap.xml</loc>');
    expect(xml).toContain('<loc>https://polymadlabs.com/focus/sitemap.xml</loc>');
    expect(xml).not.toContain('personality');
  });
});

describe('httpsRedirect', () => {
  it('sends plain HTTP to HTTPS with a 301, keeping the path and query', () => {
    const response = httpsRedirect(new URL('http://polymadlabs.com/focus/unlock?session_id=cs_1'));
    expect(response?.status).toBe(301);
    expect(response?.headers.get('location')).toBe('https://polymadlabs.com/focus/unlock?session_id=cs_1');
  });

  it('leaves HTTPS and local dev alone', () => {
    expect(httpsRedirect(new URL('https://polymadlabs.com/'))).toBeNull();
    expect(httpsRedirect(new URL('http://localhost:3000/'))).toBeNull();
  });
});
