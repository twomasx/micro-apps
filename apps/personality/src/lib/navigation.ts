const NAVIGATE_EVENT = 'personality:navigate';

/** Full path for an app path: appHref('test') is '/personality/test'. */
export function appHref(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
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
