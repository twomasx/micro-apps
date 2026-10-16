export type Route =
  | { name: 'home' }
  | { name: 'thanks'; sessionId: string | null }
  | { name: 'restore' }
  | { name: 'privacy' }
  | { name: 'notFound' };

/** Maps a URL to a screen. `base` is '/pass/'. */
export function parseRoute(pathname: string, search: string, base: string): Route {
  const path = pathname.endsWith('/') ? pathname : `${pathname}/`;
  if (!path.startsWith(base)) return { name: 'notFound' };
  const parts = path.slice(base.length).split('/').filter(Boolean);
  const [first] = parts;
  if (first === undefined) return { name: 'home' };
  if (parts.length !== 1) return { name: 'notFound' };
  // Stripe Checkout sends the buyer back with ?session_id=.
  if (first === 'thanks') return { name: 'thanks', sessionId: new URLSearchParams(search).get('session_id') };
  if (first === 'restore' || first === 'privacy') return { name: first };
  return { name: 'notFound' };
}
