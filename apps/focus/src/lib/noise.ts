export type NoiseKind = 'pink' | 'brown';

/**
 * Fills `out` with pink or brown noise, peak 1, made to loop without a click:
 * the last sample leads back into the first.
 */
export function fillNoise(out: Float32Array, kind: NoiseKind, random: () => number = Math.random): void {
  const length = out.length;
  if (length === 0) return;

  if (kind === 'pink') {
    // Paul Kellet's economy filter: white noise shaped to fall about 3 dB per octave.
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < length; i++) {
      const white = random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.099046;
      b1 = 0.963 * b1 + white * 0.2965164;
      b2 = 0.57 * b2 + white * 1.0526913;
      out[i] = b0 + b1 + b2 + white * 0.1848;
    }
  } else {
    // Leaky integrator: falls about 6 dB per octave.
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      out[i] = last;
    }
  }

  // Remove the drift between the two ends so the loop point is continuous.
  const first = out[0] ?? 0;
  const drift = (out[length - 1] ?? 0) - first;
  let sum = 0;
  for (let i = 0; i < length; i++) {
    const value = (out[i] ?? 0) - (length > 1 ? (drift * i) / (length - 1) : 0);
    out[i] = value;
    sum += value;
  }

  const mean = sum / length;
  let peak = 0;
  for (let i = 0; i < length; i++) {
    const value = (out[i] ?? 0) - mean;
    out[i] = value;
    peak = Math.max(peak, Math.abs(value));
  }
  if (peak === 0) return;
  for (let i = 0; i < length; i++) out[i] = (out[i] ?? 0) / peak;
}
