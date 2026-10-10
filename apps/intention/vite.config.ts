import react from '@vitejs/plugin-react';
import { defineConfig, type ProxyOptions } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { appConfig } from './app.config.ts';

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

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      scope: base,
      manifest: {
        id: base,
        name,
        short_name: name,
        start_url: base,
        scope: base,
        display: 'standalone',
        // Placeholders. Colours and icons come with each app's own design.
        theme_color: '#ffffff',
        background_color: '#ffffff',
        icons: [],
      },
      workbox: {
        cacheId: name,
        navigateFallbackDenylist: [/\/api\//],
      },
    }),
  ],
  server,
  preview: server,
});
