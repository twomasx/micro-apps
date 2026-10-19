const NAVIGATE_EVENT = 'intention:navigate';

/**
 * Full path for an app path: appHref('science') is '/intention/science/'. Every page ends in a slash,
 * the one form search engines see; the other form redirects to it, keeping the query.
 */
export function appHref(path: string): string {
  // A path with no page ('?t=box') is all query: the page part is empty, and the query stays as it is.
  const [, page = '', query = ''] = /^([^?#]*)(.*)$/.exec(path.replace(/^\//, '')) ?? [];
  const slashed = page === '' || page.endsWith('/') ? page : `${page}/`;
  return `${import.meta.env.BASE_URL}${slashed}${query}`;
}

/** The address being rendered at build time, when there is no browser (see src/prerender.tsx). */
let serverLocation = '/';

export function setServerLocation(path: string): void {
  serverLocation = path;
}

export function serverLocationSnapshot(): string {
  return serverLocation;
}

export function navigate(path: string, options: { replace?: boolean } = {}): void {
  if (options.replace) {
    window.history.replaceState(null, '', appHref(path));
  } else {
    window.history.pushState(null, '', appHref(path));
  }
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
}

export function subscribeToLocation(onChange: () => void): () => void {
  window.addEventListener('popstate', onChange);
  window.addEventListener(NAVIGATE_EVENT, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(NAVIGATE_EVENT, onChange);
  };
}

export function currentLocation(): string {
  return `${window.location.pathname}${window.location.search}`;
}

/** Leaves the app for another site, like Stripe Checkout. */
export function leaveTo(url: string): void {
  window.location.assign(url);
}

/**
 * Calls `onReturn` when the browser shows this page again from its back-forward cache, as after Back on
 * Stripe's checkout page. The page comes back exactly as it was left, so a button left waiting must reset.
 */
export function onPageRestored(
  onReturn: () => void,
  target: Pick<Window, 'addEventListener' | 'removeEventListener'> = window,
): () => void {
  const listener = (event: Event) => {
    if ((event as PageTransitionEvent).persisted) onReturn();
  };
  target.addEventListener('pageshow', listener);
  return () => target.removeEventListener('pageshow', listener);
}
