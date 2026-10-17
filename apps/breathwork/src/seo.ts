/**
 * Breathwork's pages for search and sharing (SEO.md): titles, descriptions, share image and structured data.
 * Read by the build (vite.config.ts) and by the app, so the browser tab shows the same title.
 * Prices come from config/products.json. Never type a price here.
 */
import { webApplication, type PageSeo, type Site } from '@micro/seo';
import { appConfig } from '../app.config.ts';
import catalog from '../config/products.json' with { type: 'json' };

export const SITE: Site = { origin: appConfig.origin, base: appConfig.base, siteName: 'PolymadLabs' };

const HOME_DESCRIPTION = 'A guided breathing timer. Pick a technique, press start and follow the dot around its shape. Free, no sign-up.';
const IMAGE = { image: 'og.png', imageAlt: 'Breathwork: a breathing timer. A dot traces a square, one side per phase of the breath.' };

export const PAGES = {
  breathe: {
    path: '',
    title: 'Breathing Exercise Timer: Box, 4-7-8, Cyclic Sigh',
    description: HOME_DESCRIPTION,
    ...IMAGE,
    jsonLd: [
      webApplication({
        name: 'Breathwork',
        url: `${SITE.origin}${SITE.base}`,
        description: HOME_DESCRIPTION,
        category: 'HealthApplication',
        freeName: 'Free: box breathing, 4-7-8 and the cyclic sigh',
        products: catalog.products,
      }),
    ],
  },
  science: {
    path: 'science/',
    title: 'Breathing Techniques: What the Research Shows',
    description:
      'Cyclic sighing, box breathing, 4-7-8 and resonant breathing compared, with the evidence for each and safety notes.',
    ...IMAGE,
  },
  privacy: {
    path: 'privacy/',
    title: 'Privacy | Breathwork',
    description: 'What Breathwork stores, where and for how long. No accounts, no ads, no tracking.',
    ...IMAGE,
  },
} satisfies Record<string, PageSeo>;

/** Routes served by a noindex shell: payments, codes, and this device's own history and patterns. */
export const PRIVATE_ROUTES = ['unlock', 'restore', 'week', 'custom'];

/** The share image: the cobalt poster with the box-breathing square and its dot. 1200x630. */
export function shareImageSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#2341d6"/>
  <rect x="780" y="135" width="330" height="330" rx="10" fill="none" stroke="#f6f7fb" stroke-width="10"/>
  <circle cx="780" cy="300" r="26" fill="#ffd45c"/>
  <text x="80" y="140" font-family="Outfit" font-weight="600" font-size="34" fill="#b4c2ff" letter-spacing="2">BREATHWORK</text>
  <text x="80" y="250" font-family="Outfit" font-weight="700" font-size="76" fill="#f6f7fb">Breathing</text>
  <text x="80" y="338" font-family="Outfit" font-weight="700" font-size="76" fill="#f6f7fb">exercise timer</text>
  <text x="80" y="420" font-family="Outfit" font-weight="500" font-size="34" fill="#f6f7fb">Box, 4-7-8 and the cyclic sigh.</text>
  <text x="80" y="470" font-family="Outfit" font-weight="500" font-size="34" fill="#f6f7fb">Follow the dot.</text>
  <text x="80" y="560" font-family="Outfit" font-weight="500" font-size="28" fill="#b4c2ff">polymadlabs.com/breathwork</text>
</svg>`;
}
