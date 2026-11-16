// The shapes the Big Five test's API returns, and the comparison of two results. Shared by the server and
// the client, so no DOM or Workers APIs. The free text comes from the server; paid text never ships in the
// client bundle.
import type { Band, BigFiveTrait } from './big-five-test.ts';
import type { Flag } from './scoring.ts';

/** One trait as everyone sees it on the free result: the score, its band and the short text for that band. */
export interface TraitView {
  trait: string;
  /** "Openness to experience" */
  name: string;
  /** 0 to 100, unrounded. */
  pct: number;
  band: Band;
  /** One sentence on what the trait measures. */
  measures: string;
  /** The short text for this band. */
  summary: string;
}

/** GET /api/results/:id for a Big Five result. */
export interface BigFiveResultResponse {
  kind: 'big-five';
  id: string;
  version: string;
  traits: TraitView[];
  flags: Flag[];
  createdAt: string;
  /** True when this request may read the report: an unlock code or an all-app pass. */
  unlocked: boolean;
}

export interface AspectView {
  aspect: string;
  name: string;
  pct: number;
  band: 'lower' | 'higher';
  measures: string;
  text: string;
}

export interface TraitReport extends TraitView {
  /** The paid, longer text for this band. */
  depth: string;
  aspects: AspectView[];
}

/** GET /api/results/:id/report for a Big Five result. */
export interface BigFiveReport {
  kind: 'big-five';
  id: string;
  version: string;
  createdAt: string;
  questionCount: number;
  traits: TraitReport[];
}

/** Two scores this close count as alike, in points on the 0 to 100 scale. */
export const ALIKE_WITHIN = 15;

export interface TraitPair {
  trait: string;
  name: string;
  a: number;
  b: number;
  /** How far apart the two scores are, in points. */
  difference: number;
  alike: boolean;
}

export interface TraitComparison {
  traits: TraitPair[];
  /**
   * "How similar your answers are": 100 minus the average gap across the five traits.
   * Never call this a compatibility score or a match percentage.
   */
  similarity: number;
}

export interface TraitCoupleSection {
  trait: string;
  /** "Conscientiousness, together" */
  title: string;
  heading: 'Alike' | 'Different';
  body: string;
  questions: string[];
}

/** GET /api/compare/:a/:b for two Big Five results. */
export interface BigFiveCompareResponse extends TraitComparison {
  kind: 'big-five';
  a: { id: string };
  b: { id: string };
  /** True when this request may read the couple report. */
  unlocked: boolean;
  couple: TraitCoupleSection[] | null;
}

/** Compares two results trait by trait. `names` maps trait ids to names. */
export function compareTraits(
  a: readonly Pick<BigFiveTrait, 'trait' | 'pct'>[],
  b: readonly Pick<BigFiveTrait, 'trait' | 'pct'>[],
  names: readonly { id: string; name: string }[],
): TraitComparison {
  const traits: TraitPair[] = [];
  for (const { id, name } of names) {
    const scoreA = a.find((score) => score.trait === id);
    const scoreB = b.find((score) => score.trait === id);
    if (!scoreA || !scoreB) continue;
    const difference = Math.abs(scoreA.pct - scoreB.pct);
    traits.push({ trait: id, name, a: scoreA.pct, b: scoreB.pct, difference, alike: difference <= ALIKE_WITHIN });
  }
  const total = traits.reduce((sum, pair) => sum + pair.difference, 0);
  return { traits, similarity: traits.length > 0 ? 100 - total / traits.length : 0 };
}

/** The same comparison seen from the other side. Used to put your own result first. */
export function swapTraitSides(compare: BigFiveCompareResponse): BigFiveCompareResponse {
  return {
    ...compare,
    a: compare.b,
    b: compare.a,
    traits: compare.traits.map((pair) => ({ ...pair, a: pair.b, b: pair.a })),
  };
}
