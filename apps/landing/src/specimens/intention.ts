import { frame, n, polyline, seeded, type Point } from './svg.ts';

/**
 * Intention: the field, Night style. Two colors fill the whole screen, Ember on the left and
 * Glacier on the right, split by a soft white seam that sways. The seam leans toward the
 * losing side as the random bits come in; specks drift off it into the side each bit favors.
 * A pale band of your color runs along the seam on your side. Dark shading at the top and
 * bottom edges, as behind the app's text and button.
 *
 * The seam wave uses the app's three sine terms (apps/intention/src/field/draw.ts).
 * Here Glacier is your color and the lean is a fixed loop, not live random numbers.
 */

/** Ember #f2683c and Glacier #7fc8e8, each drawn as a gradient from a little darker to a little lighter. */
const EMBER = '#f2683c';
const EMBER_DARK = '#d05a34';
const EMBER_LIGHT = '#f37a54';
const GLACIER_DARK = '#6dacc7';
const GLACIER_LIGHT = '#8dcfeb';
const GLACIER_PALE = '#dff1f9';
const SHADE = 'rgb(20,20,24)';

const LOOP = 12;
const ROWS = 20;
/** Seam position over the loop, as a share of the width. 0.5 is even. */
const LEAN = [0.5, 0.46, 0.41, 0.44, 0.52, 0.57, 0.53, 0.5];

/** The app's seam wave: three sines adding up to at most 4.6% of the width. */
function seam(position: number, time: number): Point[] {
  return Array.from({ length: ROWS + 1 }, (_, i) => {
    const y = i / ROWS;
    const wave = 0.022 * Math.sin(y * 5.2 + time * 1.1) + 0.008 * Math.sin(y * 13 - time * 0.8) + 0.016 * Math.sin(y * 2.1 - time * 0.35);
    return { x: (position + wave) * 120, y: y * 80 };
  });
}

/** One frame of each shape, at each step of the loop. Same commands every frame, so the browser can tween them. */
function frames() {
  return LEAN.map((position, k) => {
    const time = (k / (LEAN.length - 1)) * LOOP;
    // Wrap the wave back to its start on the last frame so the loop has no jump.
    const line = seam(position, k === LEAN.length - 1 ? 0 : time);
    const right = [...line, { x: 121, y: 80 }, { x: 121, y: 0 }];
    return { seam: polyline(line), right: polyline(right, true) };
  });
}

function specks(): string {
  const random = seeded(5);
  const parts: string[] = [];
  for (let i = 0; i < 9; i++) {
    const y = 8 + random() * 64;
    const toRight = random() < 0.5;
    const drift = (toRight ? 1 : -1) * (6 + random() * 8);
    const begin = n(random() * 3, 2);
    const x = 58 + (random() - 0.5) * 6;
    parts.push(
      `<circle cx="${n(x)}" cy="${n(y)}" r="0.55" fill="#fff" opacity="0">` +
        `<animate attributeName="opacity" dur="3s" begin="${begin}s" repeatCount="indefinite" values="0;0.42;0" keyTimes="0;0.15;1"/>` +
        `<animate attributeName="cx" dur="3s" begin="${begin}s" repeatCount="indefinite" values="${n(x)};${n(x + drift)}" keyTimes="0;1"/>` +
        `</circle>`,
    );
  }
  return parts.join('');
}

export function intentionSpecimen(): string {
  const steps = frames();
  const tween = (key: 'seam' | 'right') =>
    `<animate attributeName="d" dur="${LOOP}s" repeatCount="indefinite" calcMode="spline" values="${steps.map((s) => s[key]).join(';')}" keyTimes="${steps.map((_, k) => n(k / (steps.length - 1), 4)).join(';')}" keySplines="${steps
      .slice(1)
      .map(() => '0.45 0 0.55 1')
      .join(';')}"/>`;

  const defs =
    `<defs>` +
    `<linearGradient id="in-left" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="${EMBER_DARK}"/><stop offset="1" stop-color="${EMBER_LIGHT}"/></linearGradient>` +
    `<linearGradient id="in-right" x1="1" y1="0" x2="0.7" y2="1"><stop offset="0" stop-color="${GLACIER_DARK}"/><stop offset="1" stop-color="${GLACIER_LIGHT}"/></linearGradient>` +
    `<linearGradient id="in-shade" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${SHADE}" stop-opacity="0.37"/><stop offset="0.16" stop-color="${SHADE}" stop-opacity="0"/>` +
    `<stop offset="0.84" stop-color="${SHADE}" stop-opacity="0"/><stop offset="1" stop-color="${SHADE}" stop-opacity="0.6"/></linearGradient>` +
    `<clipPath id="in-yours"><path d="${steps[0]!.right}">${tween('right')}</path></clipPath>` +
    `</defs>`;

  const band = [
    [9, 0.08],
    [5, 0.12],
    [2.2, 0.18],
  ]
    .map(([width, alpha]) => `<path d="${steps[0]!.seam}" fill="none" stroke="${GLACIER_PALE}" stroke-width="${width}" stroke-opacity="${alpha}">${tween('seam')}</path>`)
    .join('');

  const line = [
    [2.6, 0.07],
    [1.2, 0.14],
    [0.35, 0.8],
  ]
    .map(([width, alpha]) => `<path d="${steps[0]!.seam}" fill="none" stroke="#fff" stroke-width="${width}" stroke-opacity="${alpha}">${tween('seam')}</path>`)
    .join('');

  return frame(
    'intention',
    `${defs}<rect width="120" height="80" fill="${EMBER}"/><rect width="120" height="80" fill="url(#in-left)"/>` +
      `<path d="${steps[0]!.right}" fill="url(#in-right)">${tween('right')}</path>` +
      `<g clip-path="url(#in-yours)">${band}</g>${line}${specks()}` +
      `<rect width="120" height="80" fill="url(#in-shade)"/>`,
  );
}
