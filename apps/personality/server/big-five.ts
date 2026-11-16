// Text for Big Five results, from content/big-five/. Free summaries go to anyone; the report and the couple
// report only after the unlock is confirmed (the callers check).
import { aspectBand, type Band, type BigFiveQuestions, type BigFiveTrait } from '../src/lib/big-five-test.ts';
import type { BigFiveReport, TraitComparison, TraitCoupleSection, TraitReport, TraitView } from '../src/lib/big-five-view.ts';
import { bulletLines } from '../src/lib/compare.ts';
import { getContent, section } from './content.ts';

const BAND_HEADING: Readonly<Record<Band, string>> = { lower: 'Lower', middle: 'Middle', higher: 'Higher' };

function traitName(questions: BigFiveQuestions, trait: string): string {
  return questions.axes.find((candidate) => candidate.id === trait)?.name ?? trait;
}

/** The five traits as the free result shows them. */
export function traitViews(traits: readonly BigFiveTrait[], questions: BigFiveQuestions): TraitView[] {
  return traits.map((score) => {
    const path = `big-five/traits/${score.trait}.md`;
    return {
      trait: score.trait,
      name: traitName(questions, score.trait),
      pct: score.pct,
      band: score.band,
      measures: section(path, 'What this trait measures'),
      summary: section(path, BAND_HEADING[score.band]),
    };
  });
}

/** The paid report for one Big Five result. Only call this after the unlock is confirmed. */
export function buildBigFiveReport(
  result: { id: string; createdAt: string },
  traits: readonly BigFiveTrait[],
  questions: BigFiveQuestions,
): BigFiveReport {
  const views = traitViews(traits, questions);
  const reports: TraitReport[] = views.map((view) => {
    const score = traits.find((candidate) => candidate.trait === view.trait);
    const definition = questions.axes.find((candidate) => candidate.id === view.trait);
    if (!score || !definition) throw new Error(`Missing trait ${view.trait}`);
    return {
      ...view,
      depth: section(`big-five/traits/${view.trait}.md`, `${BAND_HEADING[view.band]} in depth`),
      aspects: definition.aspects.map((aspect) => {
        const pct = score.aspects.find((candidate) => candidate.aspect === aspect.id)?.pct;
        if (pct === undefined) throw new Error(`Missing aspect ${aspect.id}`);
        const band = aspectBand(pct);
        const path = `big-five/aspects/${aspect.id}.md`;
        return {
          aspect: aspect.id,
          name: aspect.name,
          pct,
          band,
          measures: section(path, 'What this aspect measures'),
          text: section(path, band === 'lower' ? 'Lower' : 'Higher'),
        };
      }),
    };
  });
  return {
    kind: 'big-five',
    id: result.id,
    version: questions.version,
    createdAt: result.createdAt,
    questionCount: questions.items.length,
    traits: reports,
  };
}

/** The couple report for two Big Five results. Only call this after the unlock is confirmed. */
export function buildTraitCouple(comparison: TraitComparison): TraitCoupleSection[] {
  return comparison.traits.map((pair) => {
    const path = `big-five/pairs/${pair.trait}.md`;
    const heading = pair.alike ? 'Alike' : 'Different';
    return {
      trait: pair.trait,
      title: getContent(path)?.title ?? pair.name,
      heading,
      body: section(path, heading),
      questions: bulletLines(section(path, 'Questions to talk through')),
    };
  });
}
