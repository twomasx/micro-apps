/**
 * Single source for this app's name, base path and ports.
 * The pass service stays at polymadlabs.com/pass/ for good: it is the brand home, and every app,
 * wherever it is hosted, asks it about passes. (functionsPort is repeated in the dev:functions script.)
 */
export const appConfig = {
  name: 'pass',
  base: '/pass/',
  /**
   * Production address. Canonical links, share tags and the sitemap use it, on staging builds too.
   * A build can override it with PUBLIC_ORIGIN.
   */
  origin: 'https://polymadlabs.com',
  sitePort: 3007,
  functionsPort: 8807,
} as const;
