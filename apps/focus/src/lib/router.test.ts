import { describe, expect, it } from 'vitest';
import { parseRoute } from './router';

const route = (path: string, search = '') => parseRoute(path, search, '/focus/');

describe('parseRoute', () => {
  it('opens the player at the base path, with or without the trailing slash', () => {
    expect(route('/focus/')).toEqual({ name: 'player' });
    expect(route('/focus')).toEqual({ name: 'player' });
  });

  it('finds the other screens', () => {
    expect(route('/focus/science')).toEqual({ name: 'science' });
    expect(route('/focus/privacy/')).toEqual({ name: 'privacy' });
    expect(route('/focus/restore')).toEqual({ name: 'restore' });
    expect(route('/focus/bench')).toEqual({ name: 'bench' });
  });

  it('reads the Stripe session id on the unlock page', () => {
    expect(route('/focus/unlock')).toEqual({ name: 'unlock', sessionId: null });
    expect(route('/focus/unlock', '?session_id=cs_test_1')).toEqual({ name: 'unlock', sessionId: 'cs_test_1' });
  });

  it('does not match unknown or deeper paths, or other apps', () => {
    expect(route('/focus/nope')).toEqual({ name: 'notFound' });
    expect(route('/focus/science/extra')).toEqual({ name: 'notFound' });
    expect(route('/personality/')).toEqual({ name: 'notFound' });
  });

  it('works when the app sits at the root of its own domain', () => {
    expect(parseRoute('/science', '', '/')).toEqual({ name: 'science' });
    expect(parseRoute('/', '', '/')).toEqual({ name: 'player' });
  });
});
