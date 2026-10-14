import { describe, expect, it } from 'vitest';
import { withoutInjection } from './index.ts';
import { comingSoonPage, homePage, notFoundPage } from './pages.ts';
import { parseLiveApps, route } from './routes.ts';

const LIVE = parseLiveApps('personality');

describe('parseLiveApps', () => {
  it('reads a comma-separated list and ignores names that are not apps', () => {
    expect(parseLiveApps('personality, focus,nope')).toEqual(['personality', 'focus']);
    expect(parseLiveApps('')).toEqual([]);
    expect(parseLiveApps(undefined)).toEqual([]);
  });
});

describe('route', () => {
  it('serves the home page at /', () => {
    expect(route('/', LIVE)).toEqual({ kind: 'home' });
  });

  it('forwards everything under a live app', () => {
    for (const path of ['/personality/', '/personality/r/abc', '/personality/api/health']) {
      expect(route(path, LIVE)).toEqual({ kind: 'app', app: 'personality', prefix: '/personality' });
    }
  });

  it('adds the slash to a bare app path', () => {
    expect(route('/personality', LIVE)).toEqual({ kind: 'addSlash', app: 'personality' });
    expect(route('/focus', LIVE)).toEqual({ kind: 'addSlash', app: 'focus' });
  });

  it('says coming soon for the four apps that are not built', () => {
    for (const app of ['focus', 'breathwork', 'attention', 'intention'] as const) {
      expect(route(`/${app}/`, LIVE)).toEqual({ kind: 'comingSoon', app });
    }
  });

  it('returns not found for everything else', () => {
    for (const path of ['/nope', '/focus/anything', '/personalityx/', '/index.html', '/api/health']) {
      expect(route(path, LIVE)).toEqual({ kind: 'notFound' });
    }
  });
});

describe('withoutInjection', () => {
  it('marks HTML so Cloudflare adds no analytics script, and keeps the page', async () => {
    const page = withoutInjection(homePage());
    expect(page.headers.get('cache-control')).toBe('no-transform');
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('PolymadLabs');
  });

  it('keeps an existing Cache-Control value', () => {
    const response = new Response('<p>hi</p>', {
      status: 404,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0' },
    });
    const marked = withoutInjection(response);
    expect(marked.headers.get('cache-control')).toBe('public, max-age=0, no-transform');
    expect(marked.status).toBe(404);
  });

  it('leaves everything that is not HTML alone', () => {
    const json = Response.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
    expect(withoutInjection(json)).toBe(json);
  });
});

describe('pages', () => {
  it('the home page names the site and links to the personality test and breathwork', async () => {
    const response = homePage();
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('<h1>PolymadLabs</h1>');
    expect(html).toContain('href="/personality/"');
    expect(html).toContain('<a href="/breathwork/">Breathwork</a>');
  });

  it('coming soon is a 200 with a link to the personality test', async () => {
    const response = comingSoonPage('focus');
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('Coming soon');
    expect(html).toContain('href="/personality/"');
  });

  it('not found is a 404', () => {
    expect(notFoundPage().status).toBe(404);
  });
});
