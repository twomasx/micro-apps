import { bigFiveTraits } from '../src/lib/big-five.ts';
import { parseContent, type ContentFile } from '../src/lib/content.ts';
import type { QuestionFile } from '../src/lib/questions.ts';
import type { Report, ReportAxis, ReportBlock } from '../src/lib/report.ts';
import { describeAxes } from '../src/lib/result-view.ts';
import type { AxisScore } from '../src/lib/scoring.ts';
import { CONTENT } from './content.generated.ts';

const parsed = new Map<string, ContentFile>();

/** One parsed file from `content/`, by its path like 'types/INTJ.md'. */
export function getContent(path: string): ContentFile | null {
  const cached = parsed.get(path);
  if (cached) return cached;
  const text = CONTENT[path];
  if (text === undefined) return null;
  const file = parseContent(text);
  parsed.set(path, file);
  return file;
}

function section(path: string, heading: string): string {
  const body = getContent(path)?.sections[heading];
  if (!body) throw new Error(`Missing content: ${path} "${heading}"`);
  return body;
}

/** The free summary for a type, or null when there is no file for it. */
export function typeSummary(type: string): string | null {
  return getContent(`types/${type}.md`)?.sections.Summary ?? null;
}

/** The full paid report for one result. Only call this after the unlock is confirmed. */
export function buildReport(
  result: { id: string; type: string; createdAt: string },
  scores: readonly AxisScore[],
  questions: QuestionFile,
): Report {
  const { id, type } = result;
  const axes: ReportAxis[] = describeAxes(scores, questions).map((view) => {
    const path = `axes/${view.axis}.md`;
    const blocks: ReportBlock[] = [
      { heading: 'What this scale measures', body: section(path, 'What this scale measures') },
      { heading: 'Your result', body: section(path, `Leaning ${view.letter}`) },
    ];
    if (view.balanced) {
      blocks.push({ heading: 'Near the middle', body: section(path, 'Near the middle') });
    }
    blocks.push({ heading: 'As a Big Five trait', body: section(path, 'Big Five') });
    return {
      axis: view.axis,
      title: getContent(path)?.title ?? view.axis,
      letter: view.letter,
      headline: view.headline,
      balanceLabel: view.balanceLabel,
      rightPct: scores.find((score) => score.axis === view.axis)?.rightPct ?? 50,
      itemCount: questions.items.filter((item) => item.axis === view.axis).length,
      left: view.left,
      right: view.right,
      blocks,
    };
  });

  const typePath = `types/${type}.md`;
  const typeFile = getContent(typePath);
  if (!typeFile) throw new Error(`Missing content: ${typePath}`);
  const sections = Object.entries(typeFile.sections)
    .filter(([heading]) => heading !== 'Summary')
    .map(([heading, body]) => ({ heading, body }));

  return {
    id,
    type,
    version: questions.version,
    createdAt: result.createdAt,
    questionCount: questions.items.length,
    summary: section(typePath, 'Summary'),
    axes,
    traits: bigFiveTraits(scores, questions),
    sections,
  };
}
