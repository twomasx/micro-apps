import react from '@vitejs/plugin-react';
import { defineConfig, type ProxyOptions } from 'vite';
import { seoPrerender } from '@micro/seo/build';
import { fileURLToPath } from 'node:url';
import { appConfig } from './app.config.ts';
import { PAGES, PRIVATE_ROUTES, SITE, shareImageSvg } from './src/seo.ts';

const { base, sitePort, functionsPort } = appConfig;

const functions: ProxyOptions = {
  target: `http://127.0.0.1:${functionsPort}`,
  changeOrigin: true,
};
// App code calls `${import.meta.env.BASE_URL}api/...` because all apps share one
// domain. Both that and plain /api reach this app's Pages Functions.
const proxy: Record<string, ProxyOptions> = {
  '/api': functions,
  [`${base}api`]: { ...functions, rewrite: (path) => path.slice(base.length - 1) },
};

const server = { host: '0.0.0.0', port: sitePort, strictPort: true, proxy };

const font = (family: string, weight: number) =>
  fileURLToPath(
    new URL(`./node_modules/@fontsource/${family}/files/${family}-latin-${weight}-normal.woff2`, import.meta.url),
  );

// Real HTML for the pass page and the privacy note, the 404 page, the sitemap and the share image (SEO.md).
const prerender = seoPrerender({
  site: { ...SITE, origin: process.env.PUBLIC_ORIGIN ?? SITE.origin },
  entry: '/src/prerender.tsx',
  pages: Object.values(PAGES),
  privateRoutes: PRIVATE_ROUTES,
  notFoundTitle: 'Page not found | PolymadLabs Pass',
  images: [
    {
      file: 'og.png',
      svg: shareImageSvg,
      fonts: [font('ibm-plex-sans', 400), font('ibm-plex-sans', 600), font('ibm-plex-sans', 700), font('ibm-plex-mono', 500)],
    },
  ],
  preloadFonts: [/^ibm-plex-sans-latin-600-normal/, /^ibm-plex-sans-latin-400-normal/],
});

// No service worker: the pass pages are only useful online.
export default defineConfig({
  base,
  plugins: [react(), prerender],
  server,
  preview: server,
});
