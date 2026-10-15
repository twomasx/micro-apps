import { describe, expect, it } from 'vitest';
import { parseRoute } from './router';

const base = '/attention/';

describe('routes', () => {
  it('maps the app root to today', () => {
    expect(parseRoute('/attention/', '', base)).toEqual({ name: 'today' });
    expect(parseRoute('/attention', '', base)).toEqual({ name: 'today' });
  });

  it.each(['session', 'test', 'progress', 'restore', 'science', 'privacy', 'sounds'])('maps /%s', (name) => {
    expect(parseRoute(`/attention/${name}`, '', base)).toEqual({ name });
  });

  it('reads the Stripe session id on the unlock page', () => {
    expect(parseRoute('/attention/unlock', '?session_id=cs_test_1', base)).toEqual({
      name: 'unlock',
      sessionId: 'cs_test_1',
    });
  });

  it('sends anything else to not found', () => {
    expect(parseRoute('/attention/nope', '', base)).toEqual({ name: 'notFound' });
    expect(parseRoute('/attention/test/extra', '', base)).toEqual({ name: 'notFound' });
    expect(parseRoute('/focus/', '', base)).toEqual({ name: 'notFound' });
  });
});
