/**
 * Intention's pages for search and sharing (SEO.md): titles, descriptions, share image and structured data.
 * Read by the build (vite.config.ts) and by the app, so the browser tab shows the same title.
 * Prices come from config/products.json. Never type a price here.
 */
import { webApplication, type PageSeo, type Site } from '@micro/seo';
import { appConfig } from '../app.config.ts';
import catalog from '../config/products.json' with { type: 'json' };
import { FREE_RUNS_PER_DAY } from './lib/protocol.ts';

export const SITE: Site = { origin: appConfig.origin, base: appConfig.base, siteName: 'PolymadLabs' };

const HOME_DESCRIPTION =
  'A 20-second test with random bits made on our server. Every run is logged and scored against chance. Nobody has proven this. Test it.';
const IMAGE = {
  image: 'og.png',
  imageAlt: 'Intention: two colors, orange and pale blue, meet at a glowing line. Can your mind move a random number?',
};

export const PAGES = {
  tug: {
    path: '',
    title: 'Psychokinesis Test: Can Your Mind Move Numbers?',
    description: HOME_DESCRIPTION,
    ...IMAGE,
    jsonLd: [
      webApplication({
        name: 'Intention',
        url: `${SITE.origin}${SITE.base}`,
        description: HOME_DESCRIPTION,
        category: 'EducationalApplication',
        freeName: `Free: ${FREE_RUNS_PER_DAY} runs a day, Intention Hour and the global results`,
        products: catalog.products,
      }),
    ],
  },
  global: {
    path: 'global/',
    title: 'Global Results: Every Intention Run, Scored',
    description:
      'Every run anyone has ever done, combined into one line and compared against chance. Updated every 5 minutes.',
    ...IMAGE,
  },
  science: {
    path: 'science/',
    title: 'The Science of Mind and Random Numbers',
    description:
      "Princeton's PEAR lab, the failed replication, the 2006 meta-analysis, and why our server makes the bits.",
    ...IMAGE,
  },
  privacy: {
    path: 'privacy/',
    title: 'Privacy | Intention',
    description: 'What Intention stores, where and for how long. No accounts, no ads, no tracking.',
    ...IMAGE,
  },
} satisfies Record<string, PageSeo>;

/** Routes served by a noindex shell: Lab Pass payments and codes, and this device's own runs. */
export const PRIVATE_ROUTES = ['unlock', 'restore', 'me'];

/**
 * The share image: the tug of war at rest, Ember on the left and Glacier on the right, split by a softly
 * glowing seam, with the Night style's dark shading behind white text. 1200x630.
 * The renderer finds each weight by the family name ("Inter Tight") plus font-weight, and takes only the
 * first name in a font-family list.
 */
export function shareImageSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="left" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="#e45f35"/>
      <stop offset="1" stop-color="#f2683c"/>
    </linearGradient>
    <linearGradient id="right" x1="1" y1="0" x2="0.65" y2="1">
      <stop offset="0" stop-color="#76bcdb"/>
      <stop offset="1" stop-color="#7fc8e8"/>
    </linearGradient>
    <linearGradient id="seam" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#ffffff" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#141418" stop-opacity="0.42"/>
      <stop offset="0.55" stop-color="#141418" stop-opacity="0.34"/>
      <stop offset="1" stop-color="#141418" stop-opacity="0.6"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#right)"/>
  <path d="M0 0 H822 C850 120 792 230 828 340 C860 440 804 540 832 630 H0 Z" fill="url(#left)"/>
  <path d="M822 0 C850 120 792 230 828 340 C860 440 804 540 832 630" fill="none" stroke="url(#seam)" stroke-width="44" stroke-opacity="0.35"/>
  <path d="M822 0 C850 120 792 230 828 340 C860 440 804 540 832 630" fill="none" stroke="#ffffff" stroke-width="3" stroke-opacity="0.7"/>
  <rect width="1200" height="630" fill="url(#shade)"/>
  <text x="80" y="118" font-family="Inter Tight" font-weight="600" font-size="28" fill="#ffffff" letter-spacing="3">INTENTION</text>
  <text x="80" y="236" font-family="Unbounded" font-weight="300" font-size="68" fill="#ffffff" letter-spacing="-1.4">Can your mind</text>
  <text x="80" y="320" font-family="Unbounded" font-weight="300" font-size="68" fill="#ffffff" letter-spacing="-1.4">move a random</text>
  <text x="80" y="404" font-family="Unbounded" font-weight="300" font-size="68" fill="#ffffff" letter-spacing="-1.4">number?</text>
  <text x="80" y="484" font-family="Inter Tight" font-weight="500" font-size="34" fill="#ffffff">A 20-second test against chance.</text>
  <text x="80" y="560" font-family="Inter Tight" font-weight="500" font-size="28" fill="#ffffff" fill-opacity="0.84">polymadlabs.com/intention</text>
</svg>`;
}
