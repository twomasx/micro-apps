/**
 * The pass pages for search and sharing (SEO.md): titles, descriptions and the share image.
 * Read by the build (vite.config.ts) and by the app, so the browser tab shows the same title.
 */
import type { PageSeo, Site } from '@micro/seo';
import { appConfig } from '../app.config.ts';

export const SITE: Site = { origin: appConfig.origin, base: appConfig.base, siteName: 'PolymadLabs' };

const IMAGE = {
  image: 'og.png',
  imageAlt: 'The PolymadLabs pass: one payment unlocks every PolymadLabs app, including the ones added later.',
};

export const PAGES = {
  home: {
    path: '',
    title: 'PolymadLabs Pass: Every App, One Payment',
    description: 'Unlock every PolymadLabs app, including future ones, for one payment. No account, no renewals.',
    ...IMAGE,
  },
  privacy: {
    path: 'privacy/',
    title: 'Privacy | PolymadLabs Pass',
    description: 'What the PolymadLabs pass stores, where and for how long. No names, no emails, no card details.',
    ...IMAGE,
  },
} satisfies Record<string, PageSeo>;

/** Routes served by a noindex shell: the payment return and the page where a code is typed. */
export const PRIVATE_ROUTES = ['thanks', 'restore'];

const APP_NAMES = ['Personality test', 'Focus', 'Breathwork', 'Attention', 'Intention'];

/**
 * The share image, in the landing page's Lab Index look. 1200x630. The renderer matches each font file's own
 * family name: the static Medium mono file calls itself "IBM Plex Mono Medium".
 */
export function shareImageSvg(): string {
  const rows = APP_NAMES.map(
    (name, i) => `
  <line x1="760" y1="${178 + i * 64}" x2="1110" y2="${178 + i * 64}" stroke="#c5cad0" stroke-width="2"/>
  <text x="784" y="${222 + i * 64}" font-family="IBM Plex Mono Medium" font-size="22" fill="#c2410c">0${i + 1}</text>
  <text x="840" y="${222 + i * 64}" font-family="IBM Plex Sans" font-weight="600" font-size="30" fill="#111315">${name}</text>`,
  ).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#eef0f2"/>
  <rect x="80" y="112" width="14" height="14" fill="#c2410c"/>
  <text x="110" y="127" font-family="IBM Plex Mono Medium" font-size="24" fill="#c2410c" letter-spacing="2">ALL-APP PASS</text>
  <text x="80" y="236" font-family="IBM Plex Sans" font-weight="700" font-size="80" fill="#111315">Every</text>
  <text x="80" y="326" font-family="IBM Plex Sans" font-weight="700" font-size="80" fill="#111315">PolymadLabs</text>
  <text x="80" y="416" font-family="IBM Plex Sans" font-weight="700" font-size="80" fill="#111315">app</text>
  <text x="80" y="486" font-family="IBM Plex Sans" font-weight="400" font-size="32" fill="#4a5058">One payment. No account, no renewals.</text>
  <text x="80" y="560" font-family="IBM Plex Mono Medium" font-size="26" fill="#111315">polymadlabs.com/pass</text>
  <rect x="760" y="112" width="350" height="386" fill="#f8f9fa" stroke="#111315" stroke-width="2"/>
  <path d="M1094 111 H1111 V128" fill="none" stroke="#c2410c" stroke-width="6"/>
  <text x="784" y="158" font-family="IBM Plex Mono Medium" font-size="20" fill="#111315" letter-spacing="2">WHAT IT UNLOCKS</text>${rows}
</svg>`;
}
