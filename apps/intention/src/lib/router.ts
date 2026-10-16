export type Route =
  | { name: 'tug' }
  | { name: 'global' }
  | { name: 'me' }
  | { name: 'unlock'; sessionId: string | null }
  | { name: 'restore' }
  | { name: 'science' }
  | { name: 'privacy' }
  | { name: 'notFound' };

const SIMPLE = ['global', 'me', 'restore', 'science', 'privacy'] as const;

/** Maps a URL to a screen. `base` is the app's base path, like '/intention/'. */
export function parseRoute(pathname: string, search: string, base: string): Route {
  const path = pathname.endsWith('/') ? pathname : `${pathname}/`;
  if (!path.startsWith(base)) return { name: 'notFound' };

  const parts = path.slice(base.length).split('/').filter(Boolean);
  const [first] = parts;
  if (first === undefined) return { name: 'tug' };
  if (parts.length !== 1) return { name: 'notFound' };

  if (first === 'unlock') {
    // Stripe Checkout sends the buyer back with ?session_id=.
    return { name: 'unlock', sessionId: new URLSearchParams(search).get('session_id') };
  }
  const simple = SIMPLE.find((name) => name === first);
  return simple ? { name: simple } : { name: 'notFound' };
}
