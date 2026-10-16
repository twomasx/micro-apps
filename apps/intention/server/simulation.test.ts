import { describe, expect, it } from 'vitest';
import { BATCH_MS, BITS_PER_SECOND, lengthBitsFor, STANDARD_SECONDS } from '../src/lib/protocol.ts';
import { liveZ, runZ, stouffer, type Aim } from '../src/lib/scoring.ts';
import { randomBits } from './bits.ts';

/**
 * 10,000 runs of pure chance through the server's own bit maker and the real scoring code.
 * With no effect at all: about half positive, an average near 0, a spread near 1, about 5% above +1.65.
 * Bounds are four standard errors wide, so a correct build fails about once in 10,000 test runs.
 */

const RUNS = 10_000;
const LENGTH = lengthBitsFor(STANDARD_SECONDS);
const BATCH = (BITS_PER_SECOND * BATCH_MS) / 1000;
const aimOf = (i: number): Aim => (i % 2 === 0 ? 'left' : 'right');

function summarize(zs: readonly number[]) {
  const mean = zs.reduce((sum, z) => sum + z, 0) / zs.length;
  const sd = Math.sqrt(zs.reduce((sum, z) => sum + (z - mean) ** 2, 0) / (zs.length - 1));
  const share = (test: (z: number) => boolean) => zs.filter(test).length / zs.length;
  return {
    runs: zs.length,
    positive: share((z) => z > 0),
    negative: share((z) => z < 0),
    exactlyZero: share((z) => z === 0),
    mean,
    sd,
    above165: share((z) => z > 1.65),
    below165: share((z) => z < -1.65),
    combined: stouffer(zs),
  };
}

const pct = (x: number) => `${(x * 100).toFixed(2)}%`;

describe('10,000 runs of chance', () => {
  it('look like chance', () => {
    const zs: number[] = [];
    for (let i = 0; i < RUNS; i++) {
      let deviation = 0;
      for (const bit of randomBits(LENGTH)) deviation += bit ? 1 : -1;
      zs.push(runZ(deviation, aimOf(i), LENGTH));
    }
    const s = summarize(zs);
    console.log(
      [
        `Simulation: ${s.runs} runs of ${LENGTH} bits`,
        `  positive ${pct(s.positive)}, negative ${pct(s.negative)}, exactly 0 ${pct(s.exactlyZero)}`,
        `  average z ${s.mean.toFixed(4)}, spread (SD) ${s.sd.toFixed(4)}`,
        `  above +1.65: ${pct(s.above165)} (expected about 4.9%), below −1.65: ${pct(s.below165)}`,
        `  combined (Stouffer) ${s.combined.toFixed(3)}`,
      ].join('\n'),
    );
    // A deviation of exactly 0 happens in about 1.26% of 4,000-bit runs, so "positive" sits just under 50%.
    expect(s.positive).toBeGreaterThan(0.474);
    expect(s.positive).toBeLessThan(0.514);
    expect(Math.abs(s.positive - s.negative)).toBeLessThan(0.04);
    expect(Math.abs(s.mean)).toBeLessThan(0.04);
    expect(s.sd).toBeGreaterThan(0.97);
    expect(s.sd).toBeLessThan(1.03);
    expect(s.above165).toBeGreaterThan(0.04);
    expect(s.above165).toBeLessThan(0.059);
    expect(Math.abs(s.combined)).toBeLessThan(4);
  });

  it('stopping whenever you are ahead does not lift the recorded scores', () => {
    // Someone who quits a run as soon as the live score passes +1 after at least one second.
    const planned: number[] = [];
    const naive: number[] = [];
    for (let i = 0; i < RUNS; i++) {
      const aim = aimOf(i);
      const bits = randomBits(LENGTH);
      let deviation = 0;
      let n = 0;
      while (n < LENGTH) {
        for (let k = 0; k < BATCH; k++) deviation += bits[n + k] ? 1 : -1;
        n += BATCH;
        if (n >= BITS_PER_SECOND && liveZ(deviation, aim, n) > 1) break;
      }
      planned.push(runZ(deviation, aim, LENGTH));
      naive.push(liveZ(deviation, aim, n));
    }
    const p = summarize(planned);
    const q = summarize(naive);
    console.log(
      [
        `Stop-when-ahead: ${RUNS} runs, each stopped as soon as the live score passed +1`,
        `  recorded score (÷ √planned length): average ${p.mean.toFixed(4)}, combined ${p.combined.toFixed(2)}`,
        `  if scored ÷ √bits so far instead:    average ${q.mean.toFixed(4)}, combined ${q.combined.toFixed(2)}`,
      ].join('\n'),
    );
    expect(Math.abs(p.mean)).toBeLessThan(0.04);
    // The naive score would report a strong effect from pure chance.
    expect(q.mean).toBeGreaterThan(0.3);
  });
});
