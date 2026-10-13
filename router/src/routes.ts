export const APPS = ['personality', 'focus', 'breathwork', 'attention', 'intention'] as const;
export type App = (typeof APPS)[number];

export type Route =
  /** The bare domain: the placeholder home page. */
  | { kind: 'home' }
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
  if (pathname === '/') return { kind: 'home' };

  const app = APPS.find((name) => pathname === `/${name}` || pathname.startsWith(`/${name}/`));
  if (!app) return { kind: 'notFound' };
  if (pathname === `/${app}`) return { kind: 'addSlash', app };
  if (liveApps.includes(app)) return { kind: 'app', app, prefix: `/${app}` };
  // Only the app's front page says "Coming soon". Deeper paths do not exist yet.
  return pathname === `/${app}/` ? { kind: 'comingSoon', app } : { kind: 'notFound' };
}
