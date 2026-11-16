import { getBigFiveQuestions, type BigFiveTrait } from '../src/lib/big-five-test.ts';
import { compareTraits, type BigFiveCompareResponse } from '../src/lib/big-five-view.ts';
import {
  bulletLines,
  compareScores,
  type CompareResponse,
  type Comparison,
  type CoupleSection,
} from '../src/lib/compare.ts';
import { getQuestions, type QuestionFile } from '../src/lib/questions.ts';
import type { AxisScore } from '../src/lib/scoring.ts';
import { buildTraitCouple } from './big-five.ts';
import { getContent } from './content.ts';
import { error, json } from './http.ts';
import type { HasUnlock } from './payments.ts';
import { findResult } from './results.ts';

/** The couple report for one pair of four-letter results. Only call this after the unlock is confirmed. */
export function buildCoupleReport(comparison: Comparison, questions: QuestionFile): CoupleSection[] {
  return comparison.axes.map((axis) => {
    const path = `pairs/${axis.axis}.md`;
    const file = getContent(path);
    const names = questions.axes.find((candidate) => candidate.id === axis.axis);
    if (!file || !names) throw new Error(`Missing content: ${path}`);

    const heading = axis.alike
      ? `Both ${axis.a.letter}`
      : `One ${names.left.letter}, one ${names.right.letter}`;
    const body = file.sections[heading];
    const questionList = file.sections['Questions to talk through'];
    if (!body || !questionList) throw new Error(`Missing content: ${path} "${heading}"`);
    return { axis: axis.axis, title: file.title, heading, body, questions: bulletLines(questionList) };
  });
}

/**
 * GET /api/compare/:a/:b, for two results of the same test version. The comparison is free; the couple
 * report text needs the Personality unlock (or a pass) on the device asking.
 */
export async function getCompare(aId: string, bId: string, db: D1Database, hasUnlock: HasUnlock): Promise<Response> {
  if (aId === bId) {
    return error(400, 'same_result', 'Compare two different results.');
  }
  const [a, b] = await Promise.all([findResult(db, aId), findResult(db, bId)]);
  if (!a || !b) return error(404, 'not_found', 'One of these results does not exist.');
  if (a.version !== b.version) {
    return error(409, 'version_mismatch', 'These results come from different tests or versions.');
  }

  const unlocked = await hasUnlock();

  const bigFive = getBigFiveQuestions(a.version);
  if (bigFive) {
    const comparison = compareTraits(
      JSON.parse(a.scores) as BigFiveTrait[],
      JSON.parse(b.scores) as BigFiveTrait[],
      bigFive.axes,
    );
    const body: BigFiveCompareResponse = {
      kind: 'big-five',
      ...comparison,
      a: { id: a.id },
      b: { id: b.id },
      unlocked,
      couple: unlocked ? buildTraitCouple(comparison) : null,
    };
    return json(body);
  }

  const questions = getQuestions(a.version);
  if (!questions) throw new Error(`No questions for version ${a.version}`);
  const comparison = compareScores(JSON.parse(a.scores) as AxisScore[], JSON.parse(b.scores) as AxisScore[], questions);
  const body: CompareResponse = {
    kind: 'type',
    ...comparison,
    a: { id: a.id, type: a.type },
    b: { id: b.id, type: b.type },
    unlocked,
    couple: unlocked ? buildCoupleReport(comparison, questions) : null,
  };
  return json(body);
}
