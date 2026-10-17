// `pass` is the all-app pass service. It lives at polymadlabs.com/pass/ for good.
export const APPS = ['personality', 'focus', 'breathwork', 'attention', 'intention', 'pass'] as const;
export type App = (typeof APPS)[number];

/** The landing page's own files (scripts, styles, fonts, images) all live under this path. */
export const LANDING_FILES = '/_landing/';

/** Pages of the landing app other than `/`: the terms of use and the refund policy. */
export const LANDING_PAGES = ['/terms', '/refunds'] as const;

export type Route =
  /** The landing page at `/`, or one of its files under /_landing/. */
  | { kind: 'landing' }
  /** `/focus` with no slash at the end: send to `/focus/`. */
  | { kind: 'addSlash'; app: App }
  /** An app that is deployed: forward the request to it. */
  | { kind: 'app'; app: App; prefix: string }
  /** An app that is not built yet. */
  | { kind: 'comingSoon'; app: App }
  | { kind: 'notFound' };

/** Reads the LIVE_APPS setting: a comma-separated list of the apps that are deployed. */
export function parseLiveApps(setting: string | undefined): App[] {
  const names = (setting ?? '').split(',').map((name) => name.trim());
  return APPS.filter((app) => names.includes(app));
}

/** Decides what a path gets. Only the path matters, not the query. */
export function route(pathname: string, liveApps: readonly App[]): Route {
  if (pathname === '/' || pathname.startsWith(LANDING_FILES)) return { kind: 'landing' };
  if ((LANDING_PAGES as readonly string[]).includes(pathname)) return { kind: 'landing' };

  const app = APPS.find((name) => pathname === `/${name}` || pathname.startsWith(`/${name}/`));
  if (!app) return { kind: 'notFound' };
  if (pathname === `/${app}`) return { kind: 'addSlash', app };
  if (liveApps.includes(app)) return { kind: 'app', app, prefix: `/${app}` };
  // Only the app's front page says "Coming soon". Deeper paths do not exist yet.
  return pathname === `/${app}/` ? { kind: 'comingSoon', app } : { kind: 'notFound' };
}

/**
 * The path to ask the landing app for. Production (Pages, served from its root) wants `/` and
 * `/assets/...`; local dev (Vite, served under /_landing/) wants `/_landing/` and `/_landing/assets/...`.
 */
export function landingPath(pathname: string, stripPrefix: boolean): string {
  const page = (LANDING_PAGES as readonly string[]).includes(pathname);
  if (stripPrefix) return pathname === '/' || page ? pathname : pathname.slice(LANDING_FILES.length - 1);
  if (page) return `${LANDING_FILES}${pathname.slice(1)}.html`;
  return pathname === '/' ? LANDING_FILES : pathname;
}
