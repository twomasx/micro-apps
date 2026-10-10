/**
 * Single source for this app's name, base path and ports.
 * Moving the app to its own domain: change `base` to '/'.
 * (functionsPort is repeated in the dev:functions script in package.json.)
 */
export const appConfig = {
  name: 'attention',
  base: '/attention/',
  sitePort: 3004,
  functionsPort: 8804,
} as const;
