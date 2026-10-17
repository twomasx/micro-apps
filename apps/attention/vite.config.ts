import react from '@vitejs/plugin-react';
import { defineConfig, type ProxyOptions } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { seoPrerender } from '@micro/seo/build';
import { fileURLToPath } from 'node:url';
import { appConfig } from './app.config.ts';
import { PAGES, PRIVATE_ROUTES, SITE, shareImageSvg } from './src/seo.ts';

const { name, base, sitePort, functionsPort } = appConfig;

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

// The share image's fonts: the same static Latin files the app serves.
const font = (pkg: string, file: string) =>
  fileURLToPath(new URL(`./node_modules/@fontsource/${pkg}/files/${file}`, import.meta.url));
const shareFonts = [
  font('shippori-mincho', 'shippori-mincho-latin-700-normal.woff2'),
  font('zen-kaku-gothic-new', 'zen-kaku-gothic-new-latin-400-normal.woff2'),
  font('zen-kaku-gothic-new', 'zen-kaku-gothic-new-latin-500-normal.woff2'),
];

// Real HTML for every page search engines should find, the 404 page, the sitemap and the share image (SEO.md).
const prerender = seoPrerender({
  site: { ...SITE, origin: process.env.PUBLIC_ORIGIN ?? SITE.origin },
  entry: '/src/prerender.tsx',
  pages: Object.values(PAGES),
  privateRoutes: PRIVATE_ROUTES,
  notFoundTitle: 'Page not found | Attention',
  images: [{ file: 'og.png', svg: shareImageSvg, fonts: shareFonts }],
  // Today's first screen: the Mincho title and the Gothic body text.
  preloadFonts: [/^shippori-mincho-latin-700-normal/, /^zen-kaku-gothic-new-latin-400-normal/],
});

export default defineConfig({
  base,
  plugins: [
    react(),
    prerender,
    VitePWA({
      registerType: 'autoUpdate',
      scope: base,
      manifest: {
        id: base,
        name: 'Attention',
        short_name: 'Attention',
        start_url: base,
        scope: base,
        display: 'standalone',
        // Paper. The app's only background.
        theme_color: '#f3f3ef',
        background_color: '#f3f3ef',
        // Paths are relative to the manifest, so they follow `base`.
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // The circle sits inside the middle 80%, so the same picture works as a maskable icon.
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        cacheId: name,
        // Returning visitors get the plain app shell for every page, so the app draws once with what is saved on
        // the device. The prerendered pages are for first visits and search engines (SEO.md).
        globPatterns: ['**/*.{js,css,woff2,png,svg,webmanifest}', 'app.html'],
        navigateFallback: 'app.html',
        navigateFallbackDenylist: [/\/api\//],
      },
    }),
  ],
  server,
  preview: server,
});
