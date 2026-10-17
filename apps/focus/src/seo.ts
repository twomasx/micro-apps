/**
 * Focus's pages for search and sharing (SEO.md): titles, descriptions, share image and structured data.
 * Read by the build (vite.config.ts) and by the app, so the browser tab shows the same title.
 * Prices come from config/products.json. Never type a price here.
 */
import { webApplication, type PageSeo, type Site } from '@micro/seo';
import { appConfig } from '../app.config.ts';
import catalog from '../config/products.json' with { type: 'json' };

export const SITE: Site = { origin: appConfig.origin, base: appConfig.base, siteName: 'PolymadLabs' };

const HOME_DESCRIPTION =
  'Two tones, one in each ear, made live in your browser. Five presets from 2 to 40 Hz, each with its research. Free, no sign-up.';
const IMAGE = {
  image: 'og.png',
  imageAlt: 'Focus: a binaural beat player. Two stars orbit each other, one for each ear.',
};

export const PAGES = {
  player: {
    path: '',
    title: 'Binaural Beats for Focus: Free Online Player',
    description: HOME_DESCRIPTION,
    ...IMAGE,
    jsonLd: [
      webApplication({
        name: 'Focus',
        url: `${SITE.origin}${SITE.base}`,
        description: HOME_DESCRIPTION,
        category: 'HealthApplication',
        freeName: 'Free: the Sleep, Calm and Focus presets, sessions up to 10 minutes',
        products: catalog.products,
      }),
    ],
  },
  science: {
    path: 'science/',
    title: 'Do Binaural Beats Work? What the Research Shows',
    description:
      'What studies found for each beat rate, from sleep to 40 Hz, with sources. Some results are real, many are mixed.',
    ...IMAGE,
  },
  privacy: {
    path: 'privacy/',
    title: 'Privacy | Focus',
    description: 'What Focus stores, where and for how long. No accounts, no ads, no tracking.',
    ...IMAGE,
  },
} satisfies Record<string, PageSeo>;

/** Routes served by a noindex shell: the payment return and the code entry. The dev-only /bench is not built. */
export const PRIVATE_ROUTES = ['unlock', 'restore'];

/** Small stars for the share image, placed the same way on every build. */
function backgroundStars(): string {
  let seed = 7;
  const next = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const stars: string[] = [];
  for (let index = 0; index < 90; index += 1) {
    const x = Math.round(next() * 1200);
    const y = Math.round(next() * 630);
    const r = (0.6 + next() * 1.3).toFixed(1);
    const opacity = (0.18 + next() * 0.5).toFixed(2);
    stars.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="#f3ebdd" opacity="${opacity}"/>`);
  }
  return stars.join('');
}

/**
 * The share image: the Orbit night sky, two stars on one orbit (one per ear) and the name in Cormorant. 1200x630.
 * The family names are the ones inside the static font files ("Manrope ExtraLight", "Cormorant Light" for every
 * weight); the renderer matches those, then picks the weight.
 */
export function shareImageSvg(): string {
  const cx = 905;
  const cy = 315;
  const radius = 150;
  // The two stars sit opposite each other on the orbit, tilted a little, like the player at rest.
  const angle = (-28 * Math.PI) / 180;
  const ax = cx + radius * Math.cos(angle);
  const ay = cy + radius * Math.sin(angle);
  const bx = cx - radius * Math.cos(angle);
  const by = cy - radius * Math.sin(angle);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="nebula" cx="${cx}" cy="${cy}" r="560" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#171d4b"/>
      <stop offset="0.75" stop-color="#080a1c"/>
    </radialGradient>
    <radialGradient id="glow-a" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#f3ebdd" stop-opacity="0.9"/>
      <stop offset="0.16" stop-color="#f3ebdd" stop-opacity="0.4"/>
      <stop offset="0.5" stop-color="#f3ebdd" stop-opacity="0.08"/>
      <stop offset="1" stop-color="#f3ebdd" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow-b" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#f0cf8a" stop-opacity="0.9"/>
      <stop offset="0.16" stop-color="#f0cf8a" stop-opacity="0.4"/>
      <stop offset="0.5" stop-color="#f0cf8a" stop-opacity="0.08"/>
      <stop offset="1" stop-color="#f0cf8a" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#nebula)"/>
  ${backgroundStars()}
  <circle cx="${cx}" cy="${cy}" r="${radius + 52}" fill="none" stroke="#9ea3c4" stroke-opacity="0.16" stroke-width="2"/>
  <path d="M ${cx} ${cy - radius - 52} A ${radius + 52} ${radius + 52} 0 0 1 ${cx + radius + 52} ${cy}" fill="none" stroke="#e6c88f" stroke-opacity="0.75" stroke-width="3" stroke-linecap="round"/>
  <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="#9ea3c4" stroke-opacity="0.28" stroke-width="1.5" stroke-dasharray="2 9"/>
  <circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="70" fill="url(#glow-a)"/>
  <circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="9" fill="#f3ebdd"/>
  <circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="70" fill="url(#glow-b)"/>
  <circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="9" fill="#f0cf8a"/>
  <text x="${cx}" y="${cy + 12}" text-anchor="middle" font-family="Cormorant Light, Cormorant" font-weight="500" font-size="44" fill="#f3ebdd">10:00</text>
  <text x="${cx}" y="${cy + 46}" text-anchor="middle" font-family="Manrope ExtraLight, Manrope" font-weight="600" font-size="15" letter-spacing="3" fill="#9ea3c4">PRIME</text>
  <circle cx="86" cy="118" r="6" fill="#e6c88f"/>
  <text x="104" y="127" font-family="Manrope ExtraLight, Manrope" font-weight="600" font-size="26" letter-spacing="1" fill="#9ea3c4">Headphones on</text>
  <text x="76" y="262" font-family="Cormorant Light, Cormorant" font-weight="500" font-size="96" fill="#f3ebdd">Binaural beats</text>
  <text x="76" y="352" font-family="Cormorant Light, Cormorant" font-weight="500" font-size="96" fill="#f3ebdd">for focus</text>
  <text x="80" y="428" font-family="Manrope ExtraLight, Manrope" font-weight="400" font-size="30" fill="#f1ede6">Two tones, one in each ear.</text>
  <text x="80" y="472" font-family="Manrope ExtraLight, Manrope" font-weight="400" font-size="30" fill="#f1ede6">Five presets from 2 to 40 Hz.</text>
  <text x="80" y="560" font-family="Manrope ExtraLight, Manrope" font-weight="500" font-size="26" fill="#e6c88f">polymadlabs.com/focus</text>
</svg>`;
}
