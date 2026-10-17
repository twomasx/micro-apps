import { defineConfig } from 'vite';
import { appConfig } from './app.config.ts';
import { renderPage } from './src/render.ts';

const { base, sitePort } = appConfig;

const server = { host: '0.0.0.0', port: sitePort, strictPort: true };

export default defineConfig({
  base,
  plugins: [
    {
      name: 'landing-render',
      // The rows, specimens and footer links come from src/content.ts and src/specimens/.
      transformIndexHtml: { order: 'pre', handler: renderPage },
    },
  ],
  build: {
    // Fonts are small enough to fetch once; keep them as files instead of inlining into CSS.
    assetsInlineLimit: 0,
    // The terms and refund pages are their own HTML files, served at /terms and /refunds.
    rollupOptions: {
      input: { index: 'index.html', terms: 'terms.html', refunds: 'refunds.html' },
    },
  },
  server,
  preview: server,
});
