import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appHref } from './navigation.ts';

describe('appHref', () => {
  beforeEach(() => vi.stubEnv('BASE_URL', '/personality/'));
  afterEach(() => vi.unstubAllEnvs());

  it('ends every page in a slash, the form search engines see', () => {
    expect(appHref('')).toBe('/personality/');
    expect(appHref('science')).toBe('/personality/science/');
    expect(appHref('/r/abc/report')).toBe('/personality/r/abc/report/');
    expect(appHref('privacy/')).toBe('/personality/privacy/');
  });

  it('keeps the query and hash after the slash', () => {
    expect(appHref('?with=abc')).toBe('/personality/?with=abc');
    expect(appHref('pass?back=r/abc/report')).toBe('/personality/pass/?back=r/abc/report');
    expect(appHref('science#sources')).toBe('/personality/science/#sources');
  });
});
