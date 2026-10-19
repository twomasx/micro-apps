import type { QuestionFile } from './questions.ts';
import { describeAxes, type AxisView } from './result-view.ts';
import type { AxisScore } from './scoring.ts';

export interface AxisComparison {
  axis: string;
  /** True when both results have the same letter on this axis. */
  alike: boolean;
  /** How far apart the two scores are, in percentage points. */
  difference: number;
  /** Exact positions on the scale, 0 (all the way left) to 100 (all the way right). */
  aRightPct: number;
  bRightPct: number;
  a: AxisView;
  b: AxisView;
}

export interface Comparison {
  axes: AxisComparison[];
  /**
   * "How similar your answers are": 100 minus the average gap across the four axes.
   * Never call this a compatibility score or a match percentage.
   */
  similarity: number;
}

/** Compares two results axis by axis. Both must come from the same question version. */
export function compareScores(
  a: readonly AxisScore[],
  b: readonly AxisScore[],
  questions: QuestionFile,
): Comparison {
  const viewsA = describeAxes(a, questions);
  const viewsB = describeAxes(b, questions);
  const axes: AxisComparison[] = [];
  for (const viewA of viewsA) {
    const viewB = viewsB.find((view) => view.axis === viewA.axis);
    const scoreA = a.find((score) => score.axis === viewA.axis);
    const scoreB = b.find((score) => score.axis === viewA.axis);
    if (!viewB || !scoreA || !scoreB) continue;
    axes.push({
      axis: viewA.axis,
      alike: viewA.letter === viewB.letter,
      difference: Math.abs(scoreA.rightPct - scoreB.rightPct),
      aRightPct: scoreA.rightPct,
      bRightPct: scoreB.rightPct,
      a: viewA,
      b: viewB,
    });
  }
  const total = axes.reduce((sum, axis) => sum + axis.difference, 0);
  return { axes, similarity: axes.length > 0 ? 100 - total / axes.length : 0 };
}

export interface ComparedResult {
  id: string;
  type: string;
  /** True when the full report for this result is unlocked. */
  reportUnlocked: boolean;
}

export interface CoupleSection {
  axis: string;
  /** "Extraversion and Introversion, together" */
  title: string;
  /** "Both I" or "One E, one I" */
  heading: string;
  body: string;
  questions: string[];
}

/** What GET /api/compare/:a/:b returns. */
export interface CompareResponse extends Comparison {
  a: ComparedResult;
  b: ComparedResult;
  /** True when the couple report for this pair is paid. */
  unlocked: boolean;
  /** True when the buyer came back from a checkout for this pair whose payment was refunded or disputed. */
  revoked: boolean;
  /** The couple report, or null until it is unlocked. */
  couple: CoupleSection[] | null;
}

/** The same comparison seen from the other side. Used to put your own result first. */
export function swapSides(compare: CompareResponse): CompareResponse {
  return {
    ...compare,
    a: compare.b,
    b: compare.a,
    axes: compare.axes.map((axis) => ({
      ...axis,
      aRightPct: axis.bRightPct,
      bRightPct: axis.aRightPct,
      a: axis.b,
      b: axis.a,
    })),
  };
}

/** What a result id looks like. The server does the real check; this only filters junk links. */
export function looksLikeResultId(value: string | null): value is string {
  return value !== null && /^[a-z0-9]{12,32}$/.test(value);
}

/** Lines that start with "- " in a content section, as a list. */
export function bulletLines(body: string): string[] {
  return body
    .split('\n')
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim());
}
