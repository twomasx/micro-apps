import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { minify, transformWithOxc, type Plugin } from 'vite';

/**
 * Build-time only (used by vite.config.ts, never shipped). Turns src/design.ts into a plain script
 * for <head>: types removed, `export` dropped, wrapped so nothing leaks into the page's globals,
 * and a call to boot() at the end. A plain script runs before the page is drawn; a module would not.
 */
export async function compileDesignBoot(): Promise<string> {
  const source = readFileSync(new URL('./design.ts', import.meta.url), 'utf8');
  const { code } = await transformWithOxc(source, 'design.ts', { lang: 'ts' });
  if (/^\s*import\s/m.test(code)) throw new Error('src/design.ts must not import anything: it runs as a plain script.');
  const body = code.replace(/^export\s+/gm, '');
  const script = `(function(){${body}\nboot(window);})();\n`;
  const result = await minify('design-boot.js', script, { compress: true, mangle: true });
  return result.code;
}

/** Serves the script in dev and writes it as a hashed file in builds, and adds its tag to every page's <head>. */
export function designBoot(base: string): Plugin {
  let compiled: Promise<string> | undefined;
  let fileName = 'design-boot.js';
  let isBuild = false;
  const code = () => (compiled ??= compileDesignBoot());

  return {
    name: 'landing-design-boot',
    configResolved(config) {
      isBuild = config.command === 'build';
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] !== `${base}design-boot.js`) return next();
        compiled = undefined; // Rebuild on every request in dev, so edits to design.ts show on reload.
        code().then(
          (js) => {
            res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
            res.setHeader('Cache-Control', 'no-store');
            res.end(js);
          },
          (error: unknown) => next(error),
        );
      });
    },
    async buildStart() {
      if (!isBuild) return;
      const js = await code();
      const hash = createHash('sha256').update(js).digest('hex').slice(0, 8);
      fileName = `assets/design-boot-${hash}.js`;
      this.emitFile({ type: 'asset', fileName, source: js });
    },
    transformIndexHtml() {
      // At the end of <head>: after the theme-color tag it updates, before <body> is drawn.
      return [{ tag: 'script', attrs: { src: `${base}${fileName}` }, injectTo: 'head' }];
    },
  };
}
