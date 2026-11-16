import { describe, expect, it } from 'vitest';
import { parseRoute } from './router.ts';

const BASE = '/personality/';

describe('parseRoute', () => {
  it('matches the intro with and without a trailing slash', () => {
    expect(parseRoute('/personality/', '', BASE)).toEqual({ name: 'intro', kind: 'type', withId: null });
    expect(parseRoute('/personality', '', BASE)).toEqual({ name: 'intro', kind: 'type', withId: null });
  });

  it('reads ?with= on either intro', () => {
    expect(parseRoute('/personality/', '?with=abc', BASE)).toEqual({ name: 'intro', kind: 'type', withId: 'abc' });
    expect(parseRoute('/personality/big-five/', '?with=abc', BASE)).toEqual({ name: 'intro', kind: 'big-five', withId: 'abc' });
  });

  it('matches both tests and a result', () => {
    expect(parseRoute('/personality/test', '', BASE)).toEqual({ name: 'test', kind: 'type' });
    expect(parseRoute('/personality/big-five/test/', '', BASE)).toEqual({ name: 'test', kind: 'big-five' });
    expect(parseRoute('/personality/r/abc', '', BASE)).toEqual({ name: 'result', id: 'abc' });
  });

  it('matches the report', () => {
    expect(parseRoute('/personality/r/abc/report', '', BASE)).toEqual({ name: 'report', id: 'abc' });
    expect(parseRoute('/personality/r/abc/other', '', BASE)).toEqual({ name: 'notFound' });
  });

  it('matches a comparison, the science page and the privacy page', () => {
    expect(parseRoute('/personality/c/abc/def', '', BASE)).toEqual({ name: 'compare', a: 'abc', b: 'def' });
    expect(parseRoute('/personality/c/abc', '', BASE)).toEqual({ name: 'notFound' });
    expect(parseRoute('/personality/science', '', BASE)).toEqual({ name: 'science' });
    expect(parseRoute('/personality/privacy/', '', BASE)).toEqual({ name: 'privacy' });
  });

  it('matches the unlock page with the checkout session and where to go back to', () => {
    expect(parseRoute('/personality/unlock', '', BASE)).toEqual({ name: 'unlock', sessionId: null, back: null });
    expect(parseRoute('/personality/unlock/', '?session_id=cs_test_1&back=r/abc/report', BASE)).toEqual({
      name: 'unlock',
      sessionId: 'cs_test_1',
      back: 'r/abc/report',
    });
  });

  it('matches the code page at restore and at its old address, pass', () => {
    expect(parseRoute('/personality/restore', '?back=c/abc/def', BASE)).toEqual({ name: 'restore', back: 'c/abc/def' });
    expect(parseRoute('/personality/pass/', '', BASE)).toEqual({ name: 'restore', back: null });
  });

  it('only goes back to a report or a comparison of this app', () => {
    for (const back of ['https://evil.example', '//evil.example', 'science', 'r/abc', '../focus/']) {
      expect(parseRoute('/personality/restore', `?back=${encodeURIComponent(back)}`, BASE)).toEqual({ name: 'restore', back: null });
    }
  });

  it('returns notFound for anything else', () => {
    for (const path of ['/personality/nope', '/personality/r', '/personality/test/x', '/personality/big-five/x', '/focus/', '/']) {
      expect(parseRoute(path, '', BASE)).toEqual({ name: 'notFound' });
    }
  });

  it('works when the app sits on its own domain', () => {
    expect(parseRoute('/', '', '/')).toEqual({ name: 'intro', kind: 'type', withId: null });
    expect(parseRoute('/test', '', '/')).toEqual({ name: 'test', kind: 'type' });
  });
});
