import type { TestKind } from './tests.ts';

export type Route =
  /** A test's intro: the four-letter test at the app's root, the Big Five test at big-five/. */
  | { name: 'intro'; kind: TestKind; withId: string | null }
  | { name: 'test'; kind: TestKind }
  | { name: 'result'; id: string }
  | { name: 'report'; id: string }
  | { name: 'compare'; a: string; b: string }
  | { name: 'science' }
  | { name: 'privacy' }
  /** The lifetime unlock. Stripe sends buyers back here with ?session_id=. */
  | { name: 'unlock'; sessionId: string | null; back: string | null }
  /** Enter an unlock code or an all-app pass code. `back` is the report or comparison to return to. */
  | { name: 'restore'; back: string | null }
  | { name: 'notFound' };

/** Only a report or a comparison page of this app can be the place to go back to. */
const BACK_PATTERN = /^(r\/[a-z0-9]+\/report|c\/[a-z0-9]+\/[a-z0-9]+)$/;

function backFrom(search: string): string | null {
  const back = new URLSearchParams(search).get('back');
  return back && BACK_PATTERN.test(back) ? back : null;
}

/** Maps a URL to a screen. `base` is the app's base path, like '/personality/'. */
export function parseRoute(pathname: string, search: string, base: string): Route {
  const path = pathname.endsWith('/') ? pathname : `${pathname}/`;
  if (!path.startsWith(base)) return { name: 'notFound' };

  const parts = path.slice(base.length).split('/').filter(Boolean);
  const [first, second, third] = parts;
  const withId = new URLSearchParams(search).get('with');

  if (first === undefined) return { name: 'intro', kind: 'type', withId };
  if (first === 'test' && parts.length === 1) return { name: 'test', kind: 'type' };
  if (first === 'big-five' && parts.length === 1) return { name: 'intro', kind: 'big-five', withId };
  if (first === 'big-five' && second === 'test' && parts.length === 2) return { name: 'test', kind: 'big-five' };
  if (first === 'science' && parts.length === 1) return { name: 'science' };
  if (first === 'privacy' && parts.length === 1) return { name: 'privacy' };
  if (first === 'unlock' && parts.length === 1) {
    return { name: 'unlock', sessionId: new URLSearchParams(search).get('session_id'), back: backFrom(search) };
  }
  // 'pass' is the old address of the code page. Links to it keep working.
  if ((first === 'restore' || first === 'pass') && parts.length === 1) return { name: 'restore', back: backFrom(search) };
  if (first === 'c' && second !== undefined && third !== undefined && parts.length === 3) {
    return { name: 'compare', a: second, b: third };
  }
  if (first === 'r' && second !== undefined && parts.length === 2) return { name: 'result', id: second };
  if (first === 'r' && second !== undefined && third === 'report' && parts.length === 3) return { name: 'report', id: second };
  return { name: 'notFound' };
}
