import { describe, expect, it } from 'vitest';
import { parseRoute } from './router';

describe('parseRoute', () => {
  it('maps every page', () => {
    expect(parseRoute('/pass/', '', '/pass/')).toEqual({ name: 'home' });
    expect(parseRoute('/pass/thanks', '?session_id=cs_test_1', '/pass/')).toEqual({ name: 'thanks', sessionId: 'cs_test_1' });
    expect(parseRoute('/pass/restore/', '', '/pass/')).toEqual({ name: 'restore' });
    expect(parseRoute('/pass/privacy', '', '/pass/')).toEqual({ name: 'privacy' });
  });

  it('says not found for anything else', () => {
    for (const path of ['/pass/nope', '/pass/restore/x', '/focus/']) {
      expect(parseRoute(path, '', '/pass/')).toEqual({ name: 'notFound' });
    }
  });
});
