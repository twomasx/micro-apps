import { describe, expect, it } from 'vitest';
import { parseRoute } from './router.ts';

const BASE = '/intention/';

describe('routes', () => {
  it.each([
    ['/intention/', { name: 'tug' }],
    ['/intention', { name: 'tug' }],
    ['/intention/global', { name: 'global' }],
    ['/intention/global/', { name: 'global' }],
    ['/intention/me', { name: 'me' }],
    ['/intention/science', { name: 'science' }],
    ['/intention/privacy', { name: 'privacy' }],
    ['/intention/restore', { name: 'restore' }],
    ['/intention/nope', { name: 'notFound' }],
    ['/intention/global/extra', { name: 'notFound' }],
    ['/attention/', { name: 'notFound' }],
  ])('%s', (path, route) => {
    expect(parseRoute(path, '', BASE)).toEqual(route);
  });

  it('reads the Stripe session id on the unlock page', () => {
    expect(parseRoute('/intention/unlock', '?session_id=cs_test_123', BASE)).toEqual({
      name: 'unlock',
      sessionId: 'cs_test_123',
    });
    expect(parseRoute('/intention/unlock', '', BASE)).toEqual({ name: 'unlock', sessionId: null });
  });
});
