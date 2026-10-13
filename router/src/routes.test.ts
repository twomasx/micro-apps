import { describe, expect, it } from 'vitest';
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

describe('pages', () => {
  it('the home page names the site and links to the personality test', async () => {
    const response = homePage();
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('<h1>PolymadLabs</h1>');
    expect(html).toContain('href="/personality/"');
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
