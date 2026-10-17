import { describe, expect, it } from 'vitest';
import { parseRoute } from './router';

const BASE = '/breathwork/';
const route = (path: string, search = '') => parseRoute(path, search, BASE);

describe('parseRoute', () => {
  it('opens the breathing screen at the base path, with or without the slash', () => {
    expect(route('/breathwork/')).toEqual({ name: 'breathe' });
    expect(route('/breathwork')).toEqual({ name: 'breathe' });
  });

  it('knows every screen in the spec', () => {
    for (const name of ['week', 'custom', 'restore', 'science', 'privacy', 'bench']) {
      expect(route(`/breathwork/${name}`)).toEqual({ name });
    }
  });

  it('reads the Stripe session id on the unlock page', () => {
    expect(route('/breathwork/unlock', '?session_id=cs_test_123')).toEqual({ name: 'unlock', sessionId: 'cs_test_123' });
    expect(route('/breathwork/unlock/')).toEqual({ name: 'unlock', sessionId: null });
  });

  it('opens a guide page by its slug', () => {
    expect(route('/breathwork/box-breathing/')).toEqual({ name: 'guide', slug: 'box-breathing' });
    expect(route('/breathwork/box-breathing')).toEqual({ name: 'guide', slug: 'box-breathing' });
    expect(route('/breathwork/box-breathing/extra')).toEqual({ name: 'notFound' });
  });

  it('says not found for anything else', () => {
    expect(route('/focus/')).toEqual({ name: 'notFound' });
    expect(route('/breathwork/nope')).toEqual({ name: 'notFound' });
    expect(route('/breathwork/week/extra')).toEqual({ name: 'notFound' });
  });
});
