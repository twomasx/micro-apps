import catalog from '../config/apps.json';

export interface AppLink {
  app: string;
  name: string;
  /** Where the app lives. A path on this site, or a full address for an app on its own domain. */
  url: string;
}

/**
 * The apps a pass opens, from config/apps.json. On staging, EXTRA_APP_LINKS adds the same apps at their
 * own pages.dev addresses, to test that a pass works on another domain with no shared storage.
 */
export function appLinks(extra: string | undefined): AppLink[] {
  const links = catalog.apps.map(({ app, name, path }) => ({ app, name, url: path }));
  if (!extra) return links;
  try {
    const parsed = JSON.parse(extra) as unknown;
    if (!Array.isArray(parsed)) return links;
    for (const item of parsed as Record<string, unknown>[]) {
      if (typeof item.app === 'string' && typeof item.name === 'string' && typeof item.url === 'string' && item.url.startsWith('https://')) {
        links.push({ app: item.app, name: item.name, url: item.url });
      }
    }
  } catch {
    // A broken setting only loses the extra links.
  }
  return links;
}
