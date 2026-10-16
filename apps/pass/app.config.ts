/**
 * Single source for this app's name, base path and ports.
 * The pass service stays at polymadlabs.com/pass/ for good: it is the brand home, and every app,
 * wherever it is hosted, asks it about passes. (functionsPort is repeated in the dev:functions script.)
 */
export const appConfig = {
  name: 'pass',
  base: '/pass/',
  sitePort: 3007,
  functionsPort: 8807,
} as const;
