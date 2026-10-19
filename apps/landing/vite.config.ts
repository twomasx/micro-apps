import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sitemapXml } from '@micro/seo';
import { svgToPng } from '@micro/seo/build';
import { defineConfig, type Plugin } from 'vite';
import { appConfig } from './app.config.ts';
import { renderPage } from './src/render.ts';

/**
 * The landing page's sitemap and the 512 px logo that its Organization markup names. The terms and refund
 * pages join the sitemap once Roger approves them (they are noindex drafts until then).
 */
function searchFiles(): Plugin {
  let outDir = '';
  return {
    name: 'landing-search-files',
    apply: 'build',
    configResolved(config) {
      outDir = join(config.root, config.build.outDir);
    },
    async closeBundle() {
      writeFileSync(join(outDir, 'sitemap.xml'), sitemapXml([{ loc: `${appConfig.origin}/` }]));
      const icon = readFileSync(new URL('./public/favicon.svg', import.meta.url), 'utf8');
      // The icon has only a viewBox. Give it a size so it is drawn at 512 px, not 32.
      const sized = icon.replace('<svg ', '<svg width="512" height="512" ');
      writeFileSync(join(outDir, 'logo-512.png'), await svgToPng(sized, [], 512));
    },
  };
}

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
    searchFiles(),
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
