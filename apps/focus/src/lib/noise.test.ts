import { describe, expect, it } from 'vitest';
import { fillNoise, type NoiseKind } from './noise';
import { createSilentWav } from './silent-wav';

/** Small seeded generator so the tests see the same noise every run. */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function make(kind: NoiseKind, length = 48_000): Float32Array {
  const out = new Float32Array(length);
  fillNoise(out, kind, seeded(7));
  return out;
}

/** Average jump between neighbouring samples, relative to the overall level. Lower means more bass. */
function roughness(data: Float32Array): number {
  let jumps = 0;
  let level = 0;
  for (let i = 1; i < data.length; i++) {
    jumps += Math.abs(data[i]! - data[i - 1]!);
    level += Math.abs(data[i]!);
  }
  return jumps / level;
}

describe.each(['pink', 'brown'] as const)('%s noise', (kind) => {
  const data = make(kind);

  it('peaks at exactly 1 and never clips', () => {
    let peak = 0;
    for (const value of data) peak = Math.max(peak, Math.abs(value));
    expect(peak).toBeCloseTo(1, 5);
  });

  it('has no DC offset', () => {
    let sum = 0;
    for (const value of data) sum += value;
    expect(Math.abs(sum / data.length)).toBeLessThan(1e-4);
  });

  it('loops without a jump: the last sample meets the first', () => {
    expect(Math.abs(data[data.length - 1]! - data[0]!)).toBeLessThan(1e-4);
  });

  it('is the same for the same random source', () => {
    expect(Array.from(make(kind, 500))).toEqual(Array.from(make(kind, 500)));
  });
});

describe('noise colour', () => {
  it('makes brown noise smoother than pink noise', () => {
    expect(roughness(make('brown'))).toBeLessThan(roughness(make('pink')) / 2);
  });

  it('handles an empty buffer', () => {
    expect(() => fillNoise(new Float32Array(0), 'pink')).not.toThrow();
  });
});

describe('createSilentWav', () => {
  it('writes a valid 8-bit mono WAV header and silent samples', () => {
    const wav = createSilentWav(10);
    const view = new DataView(wav.buffer);
    const text = (offset: number) => String.fromCharCode(...wav.subarray(offset, offset + 4));
    expect(wav.length).toBe(44 + 80_000);
    expect(text(0)).toBe('RIFF');
    expect(view.getUint32(4, true)).toBe(wav.length - 8);
    expect(text(8)).toBe('WAVE');
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(8000);
    expect(view.getUint16(34, true)).toBe(8);
    expect(view.getUint32(40, true)).toBe(80_000);
    expect(wav.subarray(44).every((byte) => byte === 128)).toBe(true);
  });
});
