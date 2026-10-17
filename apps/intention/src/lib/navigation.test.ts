import { describe, expect, it } from 'vitest';
import { appHref } from './navigation.ts';
import { parseRoute } from './router.ts';

describe('links', () => {
  it.each([
    ['', '/intention/'],
    ['science', '/intention/science/'],
    ['/global', '/intention/global/'],
    ['unlock?session_id=cs_1', '/intention/unlock/?session_id=cs_1'],
    ['science#sources-title', '/intention/science/#sources-title'],
    ['privacy/', '/intention/privacy/'],
  ])('%s links to %s, the slashed form search engines see', (path, href) => {
    // Tests run with the base Vite gives them; the app's own base is '/intention/'.
    expect(appHref(path)).toBe(href.replace('/intention/', import.meta.env.BASE_URL));
  });

  it('every slashed link still opens its page', () => {
    expect(parseRoute('/intention/science/', '', '/intention/')).toEqual({ name: 'science' });
    expect(parseRoute('/intention/unlock/', '?session_id=cs_1', '/intention/')).toEqual({
      name: 'unlock',
      sessionId: 'cs_1',
    });
  });
});
