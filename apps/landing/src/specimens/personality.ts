import { frame, keyTimes, n, timeline } from './svg.ts';

/**
 * Personality: the result screen. A large four-letter type code over four scale bars.
 * Each bar is a thin track with a centre tick, a cobalt fill from the centre and a cobalt
 * marker with a paper halo. As in the app, the letters rise in one after another and the
 * markers slide out from the centre. Colors from apps/personality/src/base.css.
 */

const PAPER = '#f5f4f0';
const INK = '#0d0d0c';
const LINE = 'rgb(13 13 12 / 14%)';
const LINE_STRONG = 'rgb(13 13 12 / 32%)';
const COBALT = '#1f3bff';

const LOOP = 8;
const LETTERS = ['E', 'N', 'F', 'P'];
/** Where each marker lands, as the share toward the right end of the bar (0.5 is the centre). */
const RESULTS = [0.31, 0.74, 0.42, 0.66];

const LEFT = 12;
const RIGHT = 108;
const CENTRE = (LEFT + RIGHT) / 2;

export function personalitySpecimen(): string {
  const parts: string[] = [`<rect width="120" height="80" fill="${PAPER}"/>`];

  const fade = `<animate attributeName="opacity" dur="${LOOP}s" repeatCount="indefinite" values="1;1;0;0" keyTimes="0;0.9;0.97;1"/>`;
  parts.push(`<g>${fade}`);

  // One word, so the letters keep the font's own spacing. Each letter fades in 150 ms after the one before.
  const letters = LETTERS.map((letter, i) => {
    const show = timeline([0, 0, 1, 1], [0, (0.15 * i) / LOOP, (0.15 * i + 0.52) / LOOP, 1]);
    return `<tspan fill-opacity="0">${letter}<animate attributeName="fill-opacity" dur="${LOOP}s" repeatCount="indefinite" ${show}/></tspan>`;
  }).join('');
  const rise = keyTimes([0, 1.1 / LOOP, 1]);
  parts.push(
    `<text x="${LEFT - 1}" y="32" font-family="IBM Plex Sans, sans-serif" font-weight="700" font-size="25" letter-spacing="-0.6" fill="${INK}">${letters}` +
      `<animate attributeName="y" dur="${LOOP}s" repeatCount="indefinite" values="35;32;32" keyTimes="${rise}" calcMode="spline" keySplines="0.2 0.8 0.2 1;0 0 1 1"/>` +
      `</text>`,
  );

  const slideStart = 0.6 / LOOP;
  const slideEnd = (0.6 + 1.35) / LOOP;
  const slideTimes = keyTimes([0, slideStart, slideEnd, 1]);
  const ease = 'calcMode="spline" keySplines="0 0 1 1;0.2 0.8 0.2 1;0 0 1 1"';

  RESULTS.forEach((share, i) => {
    const y = 44 + i * 9.5;
    const x = LEFT + (RIGHT - LEFT) * share;
    const slide = (attribute: string) =>
      `<animate attributeName="${attribute}" dur="${LOOP}s" repeatCount="indefinite" values="${CENTRE};${CENTRE};${n(x)};${n(x)}" keyTimes="${slideTimes}" ${ease}/>`;
    parts.push(
      `<line x1="${LEFT}" x2="${RIGHT}" y1="${y}" y2="${y}" stroke="${LINE}" stroke-width="0.8"/>`,
      `<line x1="${CENTRE}" x2="${CENTRE}" y1="${y - 2.4}" y2="${y + 2.4}" stroke="${LINE_STRONG}" stroke-width="0.5"/>`,
      `<line x1="${CENTRE}" x2="${n(x)}" y1="${y}" y2="${y}" stroke="${COBALT}" stroke-width="0.8">${slide('x2')}</line>`,
      `<circle cx="${n(x)}" cy="${y}" r="2.2" fill="${COBALT}" stroke="${PAPER}" stroke-width="1.1">${slide('cx')}</circle>`,
    );
  });

  parts.push('</g>');
  return frame('personality', parts.join(''));
}
