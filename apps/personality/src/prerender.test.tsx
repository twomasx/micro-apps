// Runs in Node with no browser, as the build does.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

describe('pages rendered at build time', () => {
  let render: (url: string) => string;
  beforeAll(async () => {
    vi.stubEnv('BASE_URL', '/personality/');
    ({ render } = await import('./prerender.tsx'));
  });
  afterAll(() => vi.unstubAllEnvs());

  it('render the first-visit intro with no browser: one heading and the start link', () => {
    const html = render('/personality/');
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain('<a href="/personality/test/" class="intro-start">Start the test</a>');
    expect(html).toContain('data-in-progress="false"');
    expect(html).not.toContain('intro-last-result');
    expect(html).not.toContain('TEST MODE');
  });

  it('render the science and privacy pages with their text', () => {
    expect(render('/personality/science/')).toContain('Big Five');
    expect(render('/personality/privacy/')).toContain('How to delete your result');
  });

  it('render an unknown path as the not-found page', () => {
    expect(render('/personality/__not-found__/')).toContain('Page not found');
  });
});
