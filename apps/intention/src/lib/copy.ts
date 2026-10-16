import { oneIn, PSI_THRESHOLD, upperTail } from './scoring.ts';

/** Scores as shown: always a sign, two decimals, and a real minus sign. */
export function formatZ(z: number): string {
  const rounded = Math.round(z * 100) / 100;
  if (rounded === 0) return '0.00';
  return `${rounded > 0 ? '+' : '−'}${Math.abs(rounded).toFixed(2)}`;
}

/** At or above this "1 in X", one run is worth a second look but still proves nothing. */
const INTERESTING = 20;

/**
 * The line under a finished run. `mine` is your color's name, `other` the other color's.
 * A run below 0 is described as a pull toward the other color, at its own odds.
 */
export function runVerdict(z: number, mine: string, other: string): string {
  const rounded = Math.round(z * 100) / 100;
  if (rounded === 0) return 'Dead even. This is what chance looks like.';
  const toward = rounded > 0 ? mine : other;
  const k = oneIn(upperTail(Math.abs(z)));
  const base = `About 1 in ${k} runs pull this far toward ${toward} by chance.`;
  return k >= INTERESTING ? `${base} Interesting, but one run proves nothing.` : `${base} Normal.`;
}

/** The line under a combined total (yours, the global one, Intention Hour). */
export function totalVerdict(z: number, runs: number): string {
  const lead = `After ${runs} ${runs === 1 ? 'run' : 'runs'} your total is ${formatZ(z)}`;
  if (z <= -PSI_THRESHOLD) {
    return `${lead}. Below chance, which researchers call psi-missing. Chance alone does this about 1 time in ${oneIn(upperTail(-z))}.`;
  }
  if (z >= PSI_THRESHOLD) {
    return `${lead}. Above chance. Chance alone does this about 1 time in ${oneIn(upperTail(z))}.`;
  }
  return `${lead}: within chance.`;
}
