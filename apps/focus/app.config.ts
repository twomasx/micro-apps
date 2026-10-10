/**
 * Single source for this app's name, base path and ports.
 * Moving the app to its own domain: change `base` to '/'.
 * (functionsPort is repeated in the dev:functions script in package.json.)
 */
export const appConfig = {
  name: 'focus',
  base: '/focus/',
  sitePort: 3002,
  functionsPort: 8802,
} as const;
