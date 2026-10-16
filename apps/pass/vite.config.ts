import react from '@vitejs/plugin-react';
import { defineConfig, type ProxyOptions } from 'vite';
import { appConfig } from './app.config.ts';

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

// No service worker: the pass pages are only useful online.
export default defineConfig({
  base,
  plugins: [react()],
  server,
  preview: server,
});
