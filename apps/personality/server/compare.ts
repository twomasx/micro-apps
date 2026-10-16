import type { PaymentsContext } from '@micro/payments/server';
import {
  bulletLines,
  compareScores,
  type CompareResponse,
  type Comparison,
  type CoupleSection,
} from '../src/lib/compare.ts';
import { getQuestions, type QuestionFile } from '../src/lib/questions.ts';
import type { AxisScore } from '../src/lib/scoring.ts';
import { getContent } from './content.ts';
import { error, json } from './http.ts';
import { confirmSession } from './payments.ts';
import { findResult, isCoupleUnlocked, isReportUnlocked } from './results.ts';

/** The couple report for one pair. Only call this after the unlock is confirmed. */
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

/** GET /api/compare/:a/:b. The comparison is free; the couple report text needs the unlock. */
export async function getCompare(
  request: Request,
  aId: string,
  bId: string,
  db: D1Database,
  ctx: PaymentsContext,
  hasPass: () => Promise<boolean> = async () => false,
): Promise<Response> {
  const { mode } = ctx.settings;
  if (aId === bId) {
    return error(400, 'same_result', 'Compare two different results.');
  }
  const [a, b] = await Promise.all([findResult(db, aId), findResult(db, bId)]);
  if (!a || !b) return error(404, 'not_found', 'One of these results does not exist.');

  const questions = getQuestions(a.version);
  if (!questions || a.version !== b.version) {
    return error(409, 'version_mismatch', 'These results come from different versions of the test.');
  }

  let unlocked = await isCoupleUnlocked(db, a.id, b.id, mode);
  const sessionId = new URL(request.url).searchParams.get('session_id');
  if (!unlocked && sessionId) {
    await confirmSession(ctx, sessionId, (purchase) => {
      const pair = [purchase.result_id, purchase.partner_result_id] as unknown[];
      return pair.includes(a.id) && pair.includes(b.id);
    });
    unlocked = await isCoupleUnlocked(db, a.id, b.id, mode);
  }
  // An all-app pass unlocks every couple report and every full report.
  const pass = unlocked ? false : await hasPass();
  unlocked ||= pass;

  const comparison = compareScores(
    JSON.parse(a.scores) as AxisScore[],
    JSON.parse(b.scores) as AxisScore[],
    questions,
  );
  const [aReport, bReport] = await Promise.all([
    isReportUnlocked(db, a.id, mode).then((own) => own || pass),
    isReportUnlocked(db, b.id, mode).then((own) => own || pass),
  ]);
  const body: CompareResponse = {
    ...comparison,
    a: { id: a.id, type: a.type, reportUnlocked: aReport },
    b: { id: b.id, type: b.type, reportUnlocked: bReport },
    unlocked,
    couple: unlocked ? buildCoupleReport(comparison, questions) : null,
  };
  return json(body);
}
