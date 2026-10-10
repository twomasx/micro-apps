/**
 * Single source for this app's name, base path and ports.
 * Moving the app to its own domain: change `base` to '/'.
 * (functionsPort is repeated in the dev:functions script in package.json.)
 */
export const appConfig = {
  name: 'breathwork',
  base: '/breathwork/',
  sitePort: 3003,
  functionsPort: 8803,
} as const;
