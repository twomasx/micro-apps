import { frame, n, seeded } from './svg.ts';

/**
 * Focus: the Orbit. Two stars on one circle, exactly opposite each other, turning clockwise
 * in a fixed starfield. The left-ear star is always cream; the right-ear star takes the
 * preset's tint (Focus: gold). Behind them is the deep navy sky with its nebula glow and a
 * faint timer ring that fills with a gold arc. Colors and proportions from
 * apps/focus/src/orbit/ and apps/focus/src/styles/player.css.
 */

const SKY = '#080a1c';
const NEBULA = '#171d4b';
const CREAM = '#f3ebdd';
const GOLD = '#f0cf8a';
const RING_GOLD = '#e6c88f';
const RING = '#9ea3c4';

const CX = 60;
const CY = 38;
const ORBIT = 17;
/** The timer ring sits at 1.42 times the orbit, as in the app. */
const TIMER = ORBIT * 1.42;
/** The Focus preset (18 Hz) turns about once every 7.2 s while idle. */
const TURN = 7.2;
/** How long the gold arc takes to fill the timer ring here. */
const TIMER_LOOP = 36;

function starfield(): string {
  const random = seeded(18);
  const dots: string[] = [];
  const twinkleA: string[] = [];
  const twinkleB: string[] = [];
  for (let i = 0; i < 46; i++) {
    const x = random() * 120;
    const y = random() * 80;
    const r = 0.18 + random() * 0.55;
    const opacity = 0.22 + random() * 0.5;
    const gold = random() < 0.18;
    const dot = `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${gold ? RING_GOLD : CREAM}" opacity="${n(opacity)}"/>`;
    [dots, twinkleA, twinkleB][i % 3]!.push(dot);
  }
  const twinkle = (duration: number) =>
    `<animate attributeName="opacity" dur="${duration}s" repeatCount="indefinite" values="1;0.45;1"/>`;
  return `<g>${dots.join('')}</g><g>${twinkleA.join('')}${twinkle(9)}</g><g>${twinkleB.join('')}${twinkle(13)}</g>`;
}

/** A fading trail behind a star at angle 0, drawn as short arcs that get fainter. */
function trail(color: string): string {
  const segments = 8;
  const span = 1.1;
  const parts: string[] = [];
  for (let k = 0; k < segments; k++) {
    const a0 = -(span * k) / segments;
    const a1 = -(span * (k + 1)) / segments;
    const from = { x: CX + ORBIT * Math.cos(a0), y: CY + ORBIT * Math.sin(a0) };
    const to = { x: CX + ORBIT * Math.cos(a1), y: CY + ORBIT * Math.sin(a1) };
    const fade = 1 - k / segments;
    parts.push(
      `<path d="M${n(from.x)} ${n(from.y)}A${ORBIT} ${ORBIT} 0 0 0 ${n(to.x)} ${n(to.y)}" stroke="${color}" stroke-width="${n(0.25 + 0.9 * fade)}" opacity="${n(0.7 * fade)}" fill="none"/>`,
    );
  }
  return parts.join('');
}

function star(angle: number, color: string, glowId: string): string {
  const x = CX + ORBIT * Math.cos(angle);
  const y = CY + ORBIT * Math.sin(angle);
  return `<g transform="rotate(${n((angle * 180) / Math.PI)} ${CX} ${CY})">${trail(color)}</g><circle cx="${n(x)}" cy="${n(y)}" r="6" fill="url(#${glowId})"/><circle cx="${n(x)}" cy="${n(y)}" r="1.25" fill="${color}"/>`;
}

export function focusSpecimen(): string {
  const defs =
    `<defs>` +
    `<radialGradient id="fo-sky" cx="50%" cy="47%" r="78%"><stop offset="0" stop-color="${NEBULA}"/><stop offset="0.72" stop-color="${SKY}"/></radialGradient>` +
    `<radialGradient id="fo-cream"><stop offset="0" stop-color="${CREAM}" stop-opacity="0.55"/><stop offset="1" stop-color="${CREAM}" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="fo-gold"><stop offset="0" stop-color="${GOLD}" stop-opacity="0.55"/><stop offset="1" stop-color="${GOLD}" stop-opacity="0"/></radialGradient>` +
    `</defs>`;

  // The timer ring fills clockwise from 12 o'clock. pathLength lets the dash run from 0 to 1.
  const ring = `M${CX} ${n(CY - TIMER)}A${n(TIMER)} ${n(TIMER)} 0 1 1 ${CX} ${n(CY + TIMER)}A${n(TIMER)} ${n(TIMER)} 0 1 1 ${CX} ${n(CY - TIMER)}`;
  const timer =
    `<circle cx="${CX}" cy="${CY}" r="${n(TIMER)}" fill="none" stroke="${RING}" stroke-opacity="0.2" stroke-width="0.4"/>` +
    `<path id="fo-ring" d="${ring}" fill="none" stroke="${RING_GOLD}" stroke-width="0.6" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1">` +
    `<animate attributeName="stroke-dashoffset" dur="${TIMER_LOOP}s" repeatCount="indefinite" values="1;0;0" keyTimes="0;0.97;1"/></path>` +
    `<circle r="0.8" fill="${RING_GOLD}"><animateMotion dur="${TIMER_LOOP}s" repeatCount="indefinite" keyPoints="0;1;1" keyTimes="0;0.97;1" calcMode="linear"><mpath href="#fo-ring"/></animateMotion></circle>`;

  // The left-ear star starts at the top, the right-ear star opposite it. Both turn together.
  const orbit =
    `<g>` +
    star(-Math.PI / 2, CREAM, 'fo-cream') +
    star(Math.PI / 2, GOLD, 'fo-gold') +
    `<animateTransform attributeName="transform" type="rotate" from="0 ${CX} ${CY}" to="360 ${CX} ${CY}" dur="${TURN}s" repeatCount="indefinite"/>` +
    `</g>`;

  return frame('focus', `${defs}<rect width="120" height="80" fill="url(#fo-sky)"/>${starfield()}${timer}${orbit}`);
}
