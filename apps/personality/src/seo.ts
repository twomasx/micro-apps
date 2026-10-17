/**
 * The personality test's pages for search and sharing (SEO.md): titles, descriptions, share image and
 * structured data. Read by the build (vite.config.ts) and by the app, so the browser tab shows the same title.
 * Prices come from config/products.json. Never type a price here.
 * Never use the trademarked test names in anything here (SEO.md rule 3).
 */
import { webApplication, type PageSeo, type Site } from '@micro/seo';
import { appConfig } from '../app.config.ts';
import catalog from '../config/products.json' with { type: 'json' };

export const SITE: Site = { origin: appConfig.origin, base: appConfig.base, siteName: 'PolymadLabs' };

const HOME_DESCRIPTION =
  '40 questions built on Big Five research. Get your four-letter type with a percentage on each scale. Free result, no email, no account.';
const IMAGE = {
  image: 'og.png',
  imageAlt: 'Free personality test: 40 questions, a four-letter type and a percentage on each of four scales.',
};

export const PAGES = {
  intro: {
    path: '',
    title: 'Free Personality Test: Your Type in 6 Minutes',
    description: HOME_DESCRIPTION,
    ...IMAGE,
    jsonLd: [
      webApplication({
        name: 'Personality test',
        url: `${SITE.origin}${SITE.base}`,
        description: HOME_DESCRIPTION,
        category: 'LifestyleApplication',
        freeName: 'Free: your four-letter type with a percentage on each scale',
        products: catalog.products,
      }),
    ],
  },
  science: {
    path: 'science/',
    title: 'How This Personality Test Works: Big Five Research',
    description:
      'Where the 40 questions come from, how the four scales map to Big Five traits, and how each percentage is scored.',
    ...IMAGE,
  },
  privacy: {
    path: 'privacy/',
    title: 'Privacy | Personality test',
    description: 'What the personality test stores, where and for how long. No accounts, no ads, no outside tracking.',
    ...IMAGE,
  },
} satisfies Record<string, PageSeo>;

/**
 * Routes served by a noindex shell: results and comparisons (r/..., c/...), the pass code page, and the test
 * itself, which shows this device's answers in progress.
 */
export const PRIVATE_ROUTES = ['test', 'pass', 'r/*', 'c/*'];

/**
 * One scale on the share image, drawn like the result page: a hairline with a tick at the middle, filled in
 * the accent from the middle to the marker.
 */
function scale(y: number, left: string, right: string, rightPct: number): string {
  const x0 = 700;
  const width = 420;
  const mid = x0 + width / 2;
  const marker = x0 + (width * rightPct) / 100;
  const from = Math.min(mid, marker);
  return `
  <text x="${x0}" y="${y - 22}" font-family="Inter Tight" font-weight="600" font-size="30" fill="#0d0d0c">${left}</text>
  <text x="${x0 + width}" y="${y - 22}" font-family="Inter Tight" font-weight="600" font-size="30" fill="#0d0d0c" text-anchor="end">${right}</text>
  <rect x="${x0}" y="${y - 1}" width="${width}" height="2" fill="#0d0d0c" fill-opacity="0.32"/>
  <rect x="${mid - 1}" y="${y - 10}" width="2" height="20" fill="#0d0d0c" fill-opacity="0.32"/>
  <rect x="${from}" y="${y - 3}" width="${Math.abs(marker - mid)}" height="6" fill="#1f3bff"/>
  <circle cx="${marker}" cy="${y}" r="11" fill="#1f3bff"/>`;
}

/** The share image: the paper and ink of the app, the title, and four scales with markers. 1200x630. */
export function shareImageSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#f5f4f0"/>
  <text x="80" y="118" font-family="Inter Tight" font-weight="600" font-size="26" fill="#56554f" letter-spacing="2">FOUR SCALES. SIXTEEN TYPES.</text>
  <text x="76" y="236" font-family="Inter Tight" font-weight="700" font-size="104" fill="#0d0d0c" letter-spacing="-4">Personality</text>
  <text x="76" y="336" font-family="Inter Tight" font-weight="700" font-size="104" fill="#0d0d0c" letter-spacing="-4">test</text>
  <rect x="80" y="392" width="540" height="2" fill="#0d0d0c"/>
  <text x="80" y="448" font-family="Inter Tight" font-weight="500" font-size="32" fill="#0d0d0c">40 questions. A four-letter type</text>
  <text x="80" y="492" font-family="Inter Tight" font-weight="500" font-size="32" fill="#0d0d0c">with a percentage on each scale.</text>
  <text x="80" y="566" font-family="Inter Tight" font-weight="500" font-size="28" fill="#56554f">polymadlabs.com/personality</text>
  ${scale(170, 'E', 'I', 68)}
  ${scale(290, 'S', 'N', 57.5)}
  ${scale(410, 'T', 'F', 35)}
  ${scale(530, 'J', 'P', 45)}
</svg>`;
}
