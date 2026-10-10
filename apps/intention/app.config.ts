/**
 * Single source for this app's name, base path and ports.
 * Moving the app to its own domain: change `base` to '/'.
 * (functionsPort is repeated in the dev:functions script in package.json.)
 */
export const appConfig = {
  name: 'intention',
  base: '/intention/',
  sitePort: 3005,
  functionsPort: 8805,
} as const;
