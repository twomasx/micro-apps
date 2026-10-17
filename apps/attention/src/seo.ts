/**
 * Attention's pages for search and sharing (SEO.md): titles, descriptions, share image and structured data.
 * Read by the build (vite.config.ts) and by the app, so the browser tab shows the same title.
 * Prices come from config/products.json. Never type a price here.
 */
import { webApplication, type PageSeo, type Site } from '@micro/seo';
import { appConfig } from '../app.config.ts';
import catalog from '../config/products.json' with { type: 'json' };
import { GRAY, INK, PAPER } from './ink/draw.ts';
import { ensoSvg } from './ink/svg.ts';

export const SITE: Site = { origin: appConfig.origin, base: appConfig.base, siteName: 'PolymadLabs' };

const HOME_DESCRIPTION =
  'Train attention with your eyes closed, based on a 2019 UCSF study, and measure it with a standard research test.';
const IMAGE = {
  image: 'og.png',
  imageAlt: 'Attention: attention training with your eyes closed. A brushed ink circle on pale paper.',
};

export const PAGES = {
  today: {
    path: '',
    title: 'Attention Training: 10 Minutes a Day, Eyes Closed',
    description: HOME_DESCRIPTION,
    ...IMAGE,
    jsonLd: [
      webApplication({
        name: 'Attention',
        url: `${SITE.origin}${SITE.base}`,
        description: HOME_DESCRIPTION,
        category: 'HealthApplication',
        freeName: 'Free: the attention test any time, and 5 days of 10-minute training sessions',
        products: catalog.products,
      }),
    ],
  },
  science: {
    path: 'science/',
    title: 'How Attention Training Works: The Study and Test',
    description:
      'The 2019 study behind the training, how sessions adapt to you, and how the SART attention test is scored.',
    ...IMAGE,
  },
  privacy: {
    path: 'privacy/',
    title: 'Privacy | Attention',
    description: 'What Attention stores, where and for how long. No accounts, no ads, no tracking.',
    ...IMAGE,
  },
} satisfies Record<string, PageSeo>;

/**
 * Routes served by a noindex shell: payments and codes, and every screen built from this device's own records
 * (the session, which starts at your level; the test with your results; your progress).
 */
export const PRIVATE_ROUTES = ['unlock', 'restore', 'session', 'test', 'progress'];

/** The share image: an ink enso on paper beside the app's promise. 1200x630, the app's three colors only. */
export function shareImageSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${PAPER}"/>
  ${ensoSvg(7.3, 900, 315, 200)}
  <text x="80" y="130" font-family="Zen Kaku Gothic New Medium" font-weight="400" font-size="28" fill="${GRAY}" letter-spacing="3">ATTENTION</text>
  <text x="80" y="250" font-family="Shippori Mincho" font-weight="700" font-size="78" fill="${INK}">Attention</text>
  <text x="80" y="340" font-family="Shippori Mincho" font-weight="700" font-size="78" fill="${INK}">training</text>
  <text x="80" y="418" font-family="Zen Kaku Gothic New" font-weight="400" font-size="32" fill="${INK}">10 minutes a day, eyes closed.</text>
  <text x="80" y="464" font-family="Zen Kaku Gothic New" font-weight="400" font-size="32" fill="${INK}">Measured with a standard test.</text>
  <text x="80" y="558" font-family="Zen Kaku Gothic New Medium" font-weight="400" font-size="26" fill="${GRAY}">polymadlabs.com/attention</text>
</svg>`;
}
