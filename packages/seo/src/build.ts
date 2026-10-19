/**
 * The build step that puts real HTML on the wire (SEO.md step 1). After `vite build`, it renders every
 * indexable route of an app with React in Node and writes one file per route, with every head tag and the
 * page's main text in it. It also writes the 404 page, a noindex shell for private routes, the sitemap and the
 * share image, and fails the build if a title or description breaks the rules.
 *
 * Node only. Import from '@micro/seo/build' in vite.config.ts.
 */
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import type { Plugin, ResolvedConfig } from 'vite';
import { createServer } from 'vite';
import { headTags, pageUrl, seoProblems, sitemapXml, type PageSeo, type Site } from './index.ts';

// wawoff2 ships no types. It turns woff2 fonts back into TrueType.
const { decompress } = createRequire(import.meta.url)('wawoff2') as {
  decompress(woff2: Uint8Array): Promise<Uint8Array>;
};

export interface ShareImage {
  /** File name under the app's base, like 'og.png'. */
  file: string;
  /** The 1200x630 picture as SVG. Text uses the fonts below by family name. */
  svg: () => string;
  /** woff2 font files the SVG's text uses. */
  fonts: readonly string[];
}

export interface PrerenderOptions {
  site: Site;
  /** Module, relative to the app root, exporting `render(url: string): string`: the page's HTML for that URL. */
  entry: string;
  pages: readonly PageSeo[];
  /**
   * Routes under the base that are served by a noindex app shell (codes, payments, personal data): 'unlock',
   * or 'r/*' for every path under /r/.
   */
  privateRoutes: readonly string[];
  /** The 404 page's title. */
  notFoundTitle: string;
  images: readonly ShareImage[];
  /** woff2 files to preload: the font used above the fold. Matched against the built file names. */
  preloadFonts?: readonly RegExp[];
}

const MAX_IMAGE_BYTES = 300 * 1024;

/** Removes the template's own title and description, which every page replaces. */
function stripHead(html: string): string {
  return html.replace(/\s*<title>[\s\S]*?<\/title>/, '').replace(/\s*<meta name="description"[^>]*>/, '');
}

/** Puts the page's tags right after the viewport line, so they are the first thing in view-source. */
function withHead(template: string, tags: string): string {
  const stripped = stripHead(template);
  const viewport = stripped.match(/<meta name="viewport"[^>]*>\n/);
  if (!viewport) return stripped.replace('</head>', `    ${tags}\n  </head>`);
  return stripped.replace(viewport[0], `${viewport[0]}    ${tags}\n`);
}

function withRoot(template: string, html: string): string {
  if (!template.includes('<div id="root"></div>')) throw new Error('The page template has no empty <div id="root"></div>');
  return template.replace('<div id="root"></div>', `<div id="root">${html}</div>`);
}

/**
 * An SVG as a PNG. Text uses the given woff2 fonts by family name. resvg reads only TrueType files from disk,
 * so each woff2 is unpacked to a .ttf in the system temp folder first. System fonts are never used, so the
 * image looks the same on every machine.
 */
export async function svgToPng(svg: string, fonts: readonly string[] = [], width = 1200): Promise<Buffer> {
  const folder = mkdtempSync(join(tmpdir(), 'micro-seo-fonts-'));
  try {
    // One at a time, each copied out at once: wawoff2 returns a view into memory that its next call reuses.
    const fontFiles: string[] = [];
    for (const [index, file] of fonts.entries()) {
      const ttf = join(folder, `${index}.ttf`);
      writeFileSync(ttf, Buffer.from(await decompress(readFileSync(file))));
      fontFiles.push(ttf);
    }
    return new Resvg(svg, { font: { fontFiles, loadSystemFonts: false }, fitTo: { mode: 'width', value: width } })
      .render()
      .asPng();
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}

async function renderPng(image: ShareImage): Promise<Buffer> {
  // resvg reads TrueType, not woff2, so svgToPng unpacks the fonts first.
  const png = await svgToPng(image.svg(), image.fonts);
  if (png.length > MAX_IMAGE_BYTES) throw new Error(`${image.file} is ${Math.round(png.length / 1024)} KB, over 300 KB`);
  return png;
}

function fontPreloads(outDir: string, base: string, patterns: readonly RegExp[]): string {
  const assets = existsSync(join(outDir, 'assets')) ? readdirSync(join(outDir, 'assets')) : [];
  return patterns
    .map((pattern) => assets.find((file) => file.endsWith('.woff2') && pattern.test(file)))
    .filter((file): file is string => file !== undefined)
    .map((file) => `<link rel="preload" href="${base}assets/${file}" as="font" type="font/woff2" crossorigin />`)
    .join('\n    ');
}

/** The Vite plugin. Runs after the client build; does nothing in dev. */
export function seoPrerender(options: PrerenderOptions): Plugin {
  let config: ResolvedConfig;
  return {
    name: 'micro-seo-prerender',
    apply: 'build',
    configResolved(resolved) {
      config = resolved;
    },
    async closeBundle() {
      // An SSR build of the same config would run this plugin again. Only the client build prerenders.
      if (config.build.ssr) return;
      const problems = seoProblems(options.pages);
      if (problems.length > 0) throw new Error(`SEO problems:\n  ${problems.join('\n  ')}`);

      const outDir = join(config.root, config.build.outDir);
      const template = readFileSync(join(outDir, 'index.html'), 'utf8');
      const { site } = options;
      const preload = fontPreloads(outDir, site.base, options.preloadFonts ?? []);

      // Render with the app's own source, in Node. No browser: pages read browser state only in effects
      // or through hooks with a server value.
      const server = await createServer({
        root: config.root,
        base: site.base,
        configFile: false,
        logLevel: 'error',
        appType: 'custom',
        server: { middlewareMode: true, hmr: false, watch: null },
      });
      try {
        const { render } = (await server.ssrLoadModule(options.entry)) as { render: (url: string) => string };
        const write = (file: string, html: string | Uint8Array) => {
          mkdirSync(dirname(join(outDir, file)), { recursive: true });
          writeFileSync(join(outDir, file), html);
        };

        for (const page of options.pages) {
          const head = [headTags(site, page), preload].filter(Boolean).join('\n    ');
          write(`${page.path}index.html`, withRoot(withHead(template, head), render(`${site.base}${page.path}`)));
        }

        // Private routes: the plain app, never indexed. Served by rewrites, so Stripe's ?session_id= and
        // ?passToken= reach the app untouched, with no redirect.
        const shellHead = `<title>${options.notFoundTitle.split('|').pop()?.trim() ?? site.siteName}</title>\n    <meta name="robots" content="noindex" />`;
        write('app.html', withHead(template, shellHead));
        const rewrites = options.privateRoutes.flatMap((route) =>
          route.endsWith('/*') ? [`/${route} /app 200`] : [`/${route} /app 200`, `/${route}/ /app 200`],
        );
        appendFileSync(join(outDir, '_redirects'), `${rewrites.join('\n')}\n`);

        // Unknown paths: Pages answers with this file and a real 404 status.
        const notFoundHead = `<title>${options.notFoundTitle}</title>\n    <meta name="robots" content="noindex" />`;
        write('404.html', withRoot(withHead(template, notFoundHead), render(`${site.base}__not-found__/`)));

        write('sitemap.xml', sitemapXml(options.pages.map((page) => ({ loc: pageUrl(site, page.path) }))));

        for (const image of options.images) write(image.file, await renderPng(image));
      } finally {
        await server.close();
      }
    },
  };
}
