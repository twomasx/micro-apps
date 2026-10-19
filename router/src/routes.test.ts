import { afterEach, describe, expect, it, vi } from 'vitest';
import worker, { forwardedRequest, withoutInjection } from './index.ts';
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
    for (const path of ['/', '/_landing/', '/_landing/assets/index-abc.js', '/_landing/og.png', '/terms', '/refunds']) {
      expect(route(path, LIVE)).toEqual({ kind: 'landing' });
    }
  });

  it('forwards everything under a live app', () => {
    for (const path of ['/personality/', '/personality/r/abc', '/personality/api/health']) {
      expect(route(path, LIVE)).toEqual({ kind: 'app', app: 'personality', prefix: '/personality' });
    }
  });

  it('forwards the pass service like an app', () => {
    const live = parseLiveApps('personality,pass');
    expect(route('/pass/', live)).toEqual({ kind: 'app', app: 'pass', prefix: '/pass' });
    expect(route('/pass/api/verify', live)).toEqual({ kind: 'app', app: 'pass', prefix: '/pass' });
    expect(route('/pass', live)).toEqual({ kind: 'addSlash', app: 'pass' });
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
    for (const path of ['/nope', '/focus/anything', '/personalityx/', '/index.html', '/api/health', '/_landing', '/_landingx/', '/assets/index.js', '/og.png', '/terms/', '/terms.html']) {
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

  it('asks for the terms and refund pages by name', () => {
    expect(landingPath('/terms', true)).toBe('/terms');
    expect(landingPath('/refunds', true)).toBe('/refunds');
    expect(landingPath('/terms', false)).toBe('/_landing/terms.html');
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

describe('the worker', () => {
  const env = {
    STRIP_PREFIX: 'true',
    LIVE_APPS: 'focus',
    CANONICAL_HOST: 'polymadlabs.com',
    PUBLIC_ORIGIN: 'https://polymadlabs.com',
    LANDING_ORIGIN: 'https://landing.example',
    FOCUS_ORIGIN: 'https://focus.example',
  } as unknown as Parameters<typeof worker.fetch>[1];
  const call = (address: string) =>
    worker.fetch(new Request(address), env);

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('redirects once, straight to the final address', async () => {
    const response = await call('http://www.polymadlabs.com/focus?t=1');
    expect(response.status).toBe(301);
    expect(response.headers.get('location')).toBe('https://polymadlabs.com/focus/?t=1');
  });

  it('serves the landing sitemap from the root', async () => {
    const upstream = vi.fn(async (request: Request) => new Response(request.url));
    vi.stubGlobal('fetch', upstream);
    const response = await call('https://polymadlabs.com/sitemap-landing.xml');
    expect(await response.text()).toBe('https://landing.example/sitemap.xml');
  });

  it('puts the app prefix back on the app\'s own redirects, and marks private pages noindex', async () => {
    vi.stubGlobal('fetch', async () => new Response(null, { status: 308, headers: { location: '/science/' } }));
    const response = await call('https://polymadlabs.com/focus/science');
    expect(response.headers.get('location')).toBe('/focus/science/');
    expect(response.headers.get('x-robots-tag')).toBeNull();
    expect((await call('https://polymadlabs.com/focus/unlock')).headers.get('x-robots-tag')).toBe('noindex');
  });

  it('passes the visitor address on with the router key, and drops whatever the visitor sent', async () => {
    const upstream = vi.fn(async (request: Request) => new Response(request.url));
    vi.stubGlobal('fetch', upstream);
    const keyed = { ...(env as object), ROUTER_KEY: 'k'.repeat(64) } as unknown as Parameters<typeof worker.fetch>[1];
    const request = new Request('https://polymadlabs.com/focus/api/unlock/X', {
      headers: { 'CF-Connecting-IP': '203.0.113.7', 'X-Visitor-IP': '198.51.100.1', 'X-Router-Key': 'guess' },
    });
    await worker.fetch(request as Parameters<typeof worker.fetch>[0], keyed);
    const sent = upstream.mock.calls[0]![0];
    expect(sent.url).toBe('https://focus.example/api/unlock/X');
    expect(sent.headers.get('X-Visitor-IP')).toBe('203.0.113.7');
    expect(sent.headers.get('X-Router-Key')).toBe('k'.repeat(64));
  });
});

describe('forwardedRequest', () => {
  it('sends no visitor address without a router key', () => {
    const request = new Request('https://polymadlabs.com/focus/', {
      headers: { 'CF-Connecting-IP': '203.0.113.7', 'X-Visitor-IP': '198.51.100.1', 'X-Router-Key': 'guess' },
    });
    const sent = forwardedRequest(request, new URL('https://focus.example/'), undefined);
    expect(sent.headers.get('X-Visitor-IP')).toBeNull();
    expect(sent.headers.get('X-Router-Key')).toBeNull();
  });
});
