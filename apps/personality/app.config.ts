/**
 * Single source for this app's name, base path and ports.
 * Moving the app to its own domain: change `base` to '/'.
 * (functionsPort is repeated in the dev:functions script in package.json.)
 */
export const appConfig = {
  name: 'personality',
  base: '/personality/',
  /**
   * Production address. Canonical links, share tags and the sitemap use it, on staging builds too.
   * A build can override it with PUBLIC_ORIGIN.
   */
  origin: 'https://polymadlabs.com',
  sitePort: 3001,
  functionsPort: 8801,
} as const;
