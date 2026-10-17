/**
 * Breathwork's pages for search and sharing (SEO.md): titles, descriptions, share image and structured data.
 * Read by the build (vite.config.ts) and by the app, so the browser tab shows the same title.
 * Prices come from config/products.json. Never type a price here.
 */
import { article, breadcrumbList, webApplication, type PageSeo, type Site } from '@micro/seo';
import { appConfig } from '../app.config.ts';
import catalog from '../config/products.json' with { type: 'json' };
import { patternText } from './lib/content.ts';
import { GUIDES, guideTechnique, type Guide } from './lib/guides.ts';
import { buildShape, outlinePath, pointAt } from './lib/shape.ts';

export const SITE: Site = { origin: appConfig.origin, base: appConfig.base, siteName: 'PolymadLabs' };

const HOME_DESCRIPTION =
  'A guided breathing timer. Pick a technique, press start and follow the dot around its shape. Free, no sign-up.';
const IMAGE = {
  image: 'og.png',
  imageAlt: 'Breathwork: a breathing timer. A dot traces a square, one side per phase of the breath.',
};

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

/** Search title and description for each guide page (SEO.md step 2). The main phrase comes first. */
interface GuideSeo {
  title: string;
  description: string;
  /** The share image's two big lines. */
  imageLines: readonly [string, string];
  published: string;
  modified: string;
}

const GUIDE_SEO: Record<string, GuideSeo> = {
  'box-breathing': {
    imageLines: ['Box breathing', 'timer'],
    title: 'Box Breathing Timer: Free Guided 4-4-4-4 Breathing',
    description:
      'Breathe in 4, hold 4, out 4, hold 4. A free box breathing timer: follow the dot around the square. How to do it, the research, and who should be careful.',
    published: '2026-10-16',
    modified: '2026-10-16',
  },
};

function guideSeo(guide: Guide): GuideSeo {
  const seo = GUIDE_SEO[guide.slug];
  if (!seo) throw new Error(`No search title for the guide ${guide.slug}`);
  return seo;
}

function guidePage(guide: Guide): PageSeo {
  const seo = guideSeo(guide);
  const url = `${SITE.origin}${SITE.base}${guide.slug}/`;
  const image = `${guide.slug}/og.png`;
  return {
    path: `${guide.slug}/`,
    title: seo.title,
    description: seo.description,
    image,
    imageAlt: `${guide.name}: ${patternText(guideTechnique(guide))}. A dot traces the shape, one side per step.`,
    type: 'article',
    jsonLd: [
      article({
        headline: seo.title,
        description: seo.description,
        url,
        image: `${SITE.origin}${SITE.base}${image}`,
        datePublished: seo.published,
        dateModified: seo.modified,
        publisher: { name: 'PolymadLabs', url: `${SITE.origin}/`, logo: `${SITE.origin}/_landing/logo-512.png` },
      }),
      breadcrumbList([
        { name: 'Breathwork', url: `${SITE.origin}${SITE.base}` },
        { name: guide.name, url },
      ]),
    ],
  };
}

/** Every guide page, keyed by its slug. */
export const GUIDE_PAGES: Record<string, PageSeo> = Object.fromEntries(
  GUIDES.map((guide) => [guide.slug, guidePage(guide)]),
);

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

/** A guide's share image: the technique's own shape with its dot, its name and its timing. 1200x630. */
export function guideImageSvg(guide: Guide): string {
  const technique = guideTechnique(guide);
  const shape = buildShape(technique.phases);
  const size = 330;
  const at = (v: number) => (v * size).toFixed(1);
  const start = pointAt(shape, 0, 0);
  const [line1, line2] = guideSeo(guide).imageLines;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#2341d6"/>
  <g transform="translate(780 135)">
    <path d="${outlinePath(shape, 4)}" transform="scale(${size})" fill="none" stroke="#f6f7fb" stroke-width="${(10 / size).toFixed(4)}" stroke-linejoin="round"/>
    <circle cx="${at(start.x)}" cy="${at(start.y)}" r="26" fill="#ffd45c"/>
  </g>
  <text x="80" y="140" font-family="Outfit" font-weight="600" font-size="34" fill="#b4c2ff" letter-spacing="2">BREATHWORK</text>
  <text x="80" y="250" font-family="Outfit" font-weight="700" font-size="76" fill="#f6f7fb">${line1}</text>
  <text x="80" y="338" font-family="Outfit" font-weight="700" font-size="76" fill="#f6f7fb">${line2}</text>
  <text x="80" y="420" font-family="Outfit" font-weight="500" font-size="34" fill="#f6f7fb">${patternText(technique)}.</text>
  <text x="80" y="470" font-family="Outfit" font-weight="500" font-size="34" fill="#f6f7fb">Follow the dot.</text>
  <text x="80" y="560" font-family="Outfit" font-weight="500" font-size="28" fill="#b4c2ff">polymadlabs.com/breathwork/${guide.slug}</text>
</svg>`;
}
