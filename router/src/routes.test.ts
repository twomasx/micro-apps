import { describe, expect, it } from 'vitest';
import { withoutInjection } from './index.ts';
import { comingSoonPage, notFoundPage } from './pages.ts';
import { landingPath, parseLiveApps, route } from './routes.ts';

const LIVE = parseLiveApps('personality');

describe('parseLiveApps', () => {
  it('reads a comma-separated list and ignores names that are not apps', () => {
    expect(parseLiveApps('personality, focus,nope')).toEqual(['personality', 'focus']);
    expect(parseLiveApps('')).toEqual([]);
    expect(parseLiveApps(undefined)).toEqual([]);
  });
});

describe('route', () => {
  it('serves the landing page at / and its files under /_landing/', () => {
    for (const path of ['/', '/_landing/', '/_landing/assets/index-abc.js', '/_landing/og.png']) {
      expect(route(path, LIVE)).toEqual({ kind: 'landing' });
    }
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
    for (const path of ['/nope', '/focus/anything', '/personalityx/', '/index.html', '/api/health', '/_landing', '/_landingx/', '/assets/index.js', '/og.png']) {
      expect(route(path, LIVE)).toEqual({ kind: 'notFound' });
    }
  });
});

describe('landingPath', () => {
  it('asks Pages for the page and its files from its root', () => {
    expect(landingPath('/', true)).toBe('/');
    expect(landingPath('/_landing/assets/index-abc.js', true)).toBe('/assets/index-abc.js');
    expect(landingPath('/_landing/og.png', true)).toBe('/og.png');
  });

  it('asks the local Vite server for everything under /_landing/', () => {
    expect(landingPath('/', false)).toBe('/_landing/');
    expect(landingPath('/_landing/src/main.ts', false)).toBe('/_landing/src/main.ts');
  });
});

describe('withoutInjection', () => {
  it('marks HTML so Cloudflare adds no analytics script, and keeps the page', async () => {
    const page = withoutInjection(notFoundPage());
    expect(page.headers.get('cache-control')).toBe('no-transform');
    expect(page.status).toBe(404);
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
