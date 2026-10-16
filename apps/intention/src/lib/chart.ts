/**
 * The global chart: the running deviation toward each run's aim over every bit ever made, with the
 * curves where chance usually stays. Under chance alone, after N bits the deviation stays within
 * ±1.96 √N 19 times in 20 and within ±2.576 √N 99 times in 100.
 */

export const Z_20 = 1.96;
export const Z_100 = 2.576;
/** Points per band edge. The curves are smooth, so a few dozen are plenty. */
const BAND_STEPS = 48;

export interface ChartShape {
  /** SVG path of the running deviation. */
  line: string;
  /** Closed SVG paths of the two chance bands. */
  band20: string;
  band100: string;
  /** Height of the zero line. */
  zeroY: number;
  /** Largest deviation the chart can show, up and down. */
  yMax: number;
  xMax: number;
  /** Where the line ends, for its end dot. */
  end: { x: number; y: number };
}

const fmt = (v: number) => (Math.round(v * 10) / 10).toString();

export function chartShape(bits: readonly number[], deviation: readonly number[], width: number, height: number): ChartShape {
  const xMax = Math.max(1, bits.at(-1) ?? 1);
  const maxDev = deviation.reduce((m, d) => Math.max(m, Math.abs(d)), 0);
  // Always room for the outer band, plus a little air.
  const yMax = Math.max(10, maxDev, Z_100 * Math.sqrt(xMax)) * 1.15;
  const x = (b: number) => (b / xMax) * width;
  const y = (d: number) => height / 2 - (d / yMax) * (height / 2);

  const line = bits.map((b, i) => `${i === 0 ? 'M' : 'L'}${fmt(x(b))} ${fmt(y(deviation[i]!))}`).join(' ');
  const band = (k: number) => {
    const top: string[] = [];
    const bottom: string[] = [];
    for (let i = 0; i <= BAND_STEPS; i++) {
      const b = (xMax * i) / BAND_STEPS;
      const edge = k * Math.sqrt(b);
      top.push(`${fmt(x(b))} ${fmt(y(edge))}`);
      bottom.unshift(`${fmt(x(b))} ${fmt(y(-edge))}`);
    }
    return `M${top.join(' L')} L${bottom.join(' L')} Z`;
  };
  return {
    line,
    band20: band(Z_20),
    band100: band(Z_100),
    zeroY: height / 2,
    yMax,
    xMax,
    end: { x: x(bits.at(-1) ?? 0), y: y(deviation.at(-1) ?? 0) },
  };
}

/** Where the line ends, in plain words. */
export function chartVerdict(bitsTotal: number, deviation: number): string {
  if (bitsTotal === 0) return '';
  const edge20 = Z_20 * Math.sqrt(bitsTotal);
  const edge100 = Z_100 * Math.sqrt(bitsTotal);
  const where = deviation > 0 ? 'above' : 'below';
  if (Math.abs(deviation) <= edge20) return 'The line is inside the shaded area, where chance keeps it 19 times in 20.';
  if (Math.abs(deviation) <= edge100) {
    return `The line is ${where} the inner band but inside the outer one. Chance does this about 1 time in 20, so it is worth watching, not a finding.`;
  }
  return `The line is ${where} both bands. Chance does this less than 1 time in 100. What matters is whether it stays out as more runs come in.`;
}
