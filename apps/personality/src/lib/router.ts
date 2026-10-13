export type Route =
  | { name: 'intro'; withId: string | null }
  | { name: 'test' }
  | { name: 'result'; id: string }
  | { name: 'report'; id: string; sessionId: string | null }
  | { name: 'compare'; a: string; b: string; sessionId: string | null }
  | { name: 'science' }
  | { name: 'privacy' }
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
  if (first === 'science' && parts.length === 1) return { name: 'science' };
  if (first === 'privacy' && parts.length === 1) return { name: 'privacy' };
  if (first === 'c' && second !== undefined && third !== undefined && parts.length === 3) {
    const sessionId = new URLSearchParams(search).get('session_id');
    return { name: 'compare', a: second, b: third, sessionId };
  }
  if (first === 'r' && second !== undefined && parts.length === 2) {
    return { name: 'result', id: second };
  }
  if (first === 'r' && second !== undefined && third === 'report' && parts.length === 3) {
    // Stripe Checkout sends the buyer back with ?session_id=.
    return { name: 'report', id: second, sessionId: new URLSearchParams(search).get('session_id') };
  }
  return { name: 'notFound' };
}
