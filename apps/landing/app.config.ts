/**
 * Single source for the landing page's name, base path and port.
 * The page itself is served at "/" by the router. Its files (scripts, styles, fonts,
 * images) live under `base`, so they never clash with the five apps' paths.
 */
export const appConfig = {
  name: 'landing',
  base: '/_landing/',
  sitePort: 3006,
  /** Where the page is published. Link previews need absolute image URLs. */
  origin: 'https://polymadlabs.com',
} as const;
