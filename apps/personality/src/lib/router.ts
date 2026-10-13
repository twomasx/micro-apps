export type Route =
  | { name: 'intro'; withId: string | null }
  | { name: 'test' }
  | { name: 'result'; id: string }
  | { name: 'report'; id: string; sessionId: string | null }
  | { name: 'notFound' };

/** Maps a URL to a screen. `base` is the app's base path, like '/personality/'. */
export function parseRoute(pathname: string, search: string, base: string): Route {
  const path = pathname.endsWith('/') ? pathname : `${pathname}/`;
  if (!path.startsWith(base)) return { name: 'notFound' };

  const parts = path.slice(base.length).split('/').filter(Boolean);
  const [first, second, third] = parts;

  if (first === undefined) {
    return { name: 'intro', withId: new URLSearchParams(search).get('with') };
  }
  if (first === 'test' && parts.length === 1) return { name: 'test' };
  if (first === 'r' && second !== undefined && parts.length === 2) {
    return { name: 'result', id: second };
  }
  if (first === 'r' && second !== undefined && third === 'report' && parts.length === 3) {
    // Stripe Checkout sends the buyer back with ?session_id=.
    return { name: 'report', id: second, sessionId: new URLSearchParams(search).get('session_id') };
  }
  return { name: 'notFound' };
}
