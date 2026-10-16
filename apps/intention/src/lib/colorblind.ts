import { fromLinear, oklabDistance, toLinear, type Rgb } from './color.ts';

/**
 * Red-green color blindness, simulated with the matrices of Machado, Oliveira and Fernandes (2009),
 * "A physiologically-based model for simulation of color vision deficiency", IEEE TVCG 15(6), at full
 * severity. They apply to linear RGB.
 */

export type Vision = 'typical' | 'protanopia' | 'deuteranopia';

const MATRICES: Record<Exclude<Vision, 'typical'>, readonly (readonly [number, number, number])[]> = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
};

export function simulate(c: Rgb, vision: Vision): Rgb {
  if (vision === 'typical') return c;
  const linear = [toLinear(c[0]), toLinear(c[1]), toLinear(c[2])] as const;
  const [r, g, b] = MATRICES[vision].map((row) => row[0] * linear[0] + row[1] * linear[1] + row[2] * linear[2]) as [
    number,
    number,
    number,
  ];
  return [fromLinear(r), fromLinear(g), fromLinear(b)];
}

/**
 * Two colors count as easy to tell apart at this Oklab distance or more. About 0.02 is just noticeable;
 * 0.1 is a clear difference at a glance, which a full-screen tug of war needs.
 */
export const DISTINCT = 0.1;

export const VISIONS: readonly Vision[] = ['typical', 'protanopia', 'deuteranopia'];

/** How different the two colors look to each kind of vision. */
export function pairDistances(a: Rgb, b: Rgb): Record<Vision, number> {
  const out = {} as Record<Vision, number>;
  for (const vision of VISIONS) out[vision] = oklabDistance(simulate(a, vision), simulate(b, vision));
  return out;
}

/** The kinds of vision for which this pair is hard to tell apart. Empty when it works for everyone checked. */
export function hardToTellApart(a: Rgb, b: Rgb): Vision[] {
  const distances = pairDistances(a, b);
  return VISIONS.filter((vision) => distances[vision] < DISTINCT);
}
