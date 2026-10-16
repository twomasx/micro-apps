/**
 * Scoring for every intention exercise. Shared by the client and the server, so they can never disagree.
 *
 * Each bit is +1 (a 1) or −1 (a 0). The running total is the deviation.
 * 1 bits favor the right-hand color. A run's aim says which color the person pulls for.
 */

export type Aim = 'left' | 'right';

/** +1 when 1 bits help the aim, −1 when 0 bits do. */
export function aimSign(aim: Aim): 1 | -1 {
  return aim === 'right' ? 1 : -1;
}

/** Deviation toward the aim. A plain 0 when even, never −0. */
function towardAim(deviation: number, aim: Aim): number {
  return deviation === 0 ? 0 : deviation * aimSign(aim);
}

/** Deviation of a run of 0/1 values: the number of 1s minus the number of 0s. */
export function deviationOf(bits: ArrayLike<number>): number {
  let deviation = 0;
  for (let i = 0; i < bits.length; i++) deviation += bits[i] ? 1 : -1;
  return deviation;
}

/**
 * The score shown while bits arrive: deviation toward the aim ÷ √(bits so far).
 * For display only. A run's recorded score is `runZ`.
 */
export function liveZ(deviation: number, aim: Aim, n: number): number {
  return n > 0 ? towardAim(deviation, aim) / Math.sqrt(n) : 0;
}

/**
 * A run's recorded score: deviation toward the aim ÷ √(planned length).
 *
 * For a complete run this is exactly deviation ÷ √(bits). For a run stopped early it divides by the
 * planned length, not the bits it got. Under chance the running deviation is expected to stay where it is,
 * so this score stays centered on 0 even for someone who stops whenever they are ahead. Dividing by the
 * bits so far would let stopping early push the totals above chance with no real effect.
 */
export function runZ(deviation: number, aim: Aim, lengthBits: number): number {
  return lengthBits > 0 ? towardAim(deviation, aim) / Math.sqrt(lengthBits) : 0;
}

/**
 * Complementary error function. Numerical Recipes `erfcc`: fractional error under 1.2e-7 everywhere,
 * so tail chances stay accurate far out (unlike the shorter Abramowitz and Stegun formula).
 */
export function erfc(x: number): number {
  const z = Math.abs(x);
  const t = 1 / (1 + 0.5 * z);
  const r =
    t *
    Math.exp(
      -z * z -
        1.26551223 +
        t *
          (1.00002368 +
            t *
              (0.37409196 +
                t *
                  (0.09678418 +
                    t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))),
    );
  return x >= 0 ? r : 2 - r;
}

/** One-sided chance of a score at least this high: P(Z ≥ z) under the normal distribution. */
export function upperTail(z: number): number {
  return 0.5 * erfc(z / Math.SQRT2);
}

/** "1 in X" for a chance p, rounded to a whole number. */
export function oneIn(p: number): number {
  return Math.max(1, Math.round(1 / p));
}

/** Stouffer's method: the sum of the z scores divided by the square root of how many there are. */
export function stouffer(zs: readonly number[]): number {
  if (zs.length === 0) return 0;
  let sum = 0;
  for (const z of zs) sum += z;
  return sum / Math.sqrt(zs.length);
}

/** Stouffer's method from a running sum, for totals kept in the database. */
export function stoufferFromSum(sumZ: number, count: number): number {
  return count > 0 ? sumZ / Math.sqrt(count) : 0;
}

/** The score at which chance alone gets this far about 1 time in 40 (one-sided). */
export const PSI_THRESHOLD = 1.96;
