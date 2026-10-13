import { describe, expect, it } from 'vitest';
import { parseRoute } from './router.ts';

const BASE = '/personality/';

describe('parseRoute', () => {
  it('matches the intro with and without a trailing slash', () => {
    expect(parseRoute('/personality/', '', BASE)).toEqual({ name: 'intro', withId: null });
    expect(parseRoute('/personality', '', BASE)).toEqual({ name: 'intro', withId: null });
  });

  it('reads ?with= on the intro', () => {
    expect(parseRoute('/personality/', '?with=abc', BASE)).toEqual({ name: 'intro', withId: 'abc' });
  });

  it('matches the test and a result', () => {
    expect(parseRoute('/personality/test', '', BASE)).toEqual({ name: 'test' });
    expect(parseRoute('/personality/r/abc', '', BASE)).toEqual({ name: 'result', id: 'abc' });
  });

  it('returns notFound for anything else', () => {
    for (const path of ['/personality/nope', '/personality/r', '/personality/test/x', '/focus/', '/']) {
      expect(parseRoute(path, '', BASE)).toEqual({ name: 'notFound' });
    }
  });

  it('works when the app sits on its own domain', () => {
    expect(parseRoute('/', '', '/')).toEqual({ name: 'intro', withId: null });
    expect(parseRoute('/test', '', '/')).toEqual({ name: 'test' });
  });
});
