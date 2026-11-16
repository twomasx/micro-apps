// Scoring for the Big Five test (version b1, the Big Five Aspect Scales). Pure TypeScript with no DOM or
// Workers APIs, so the client and the Pages Functions import the same module. Not to be confused with
// big-five.ts, which reads the four-letter test's scales as Big Five traits.
import b1 from '../data/items.b1.json';
import { MAX_ANSWER, MIN_ANSWER, readAnswer, ScoringError, type Answers, type Flag } from './scoring.ts';

export type BigFiveQuestions = typeof b1;
export type BigFiveItem = BigFiveQuestions['items'][number];
export type TraitDefinition = BigFiveQuestions['axes'][number];

export const BIG_FIVE_VERSION = b1.version;
export const bigFiveQuestions: BigFiveQuestions = b1;

/** Where a trait score sits on its scale. Not a comparison with other people: there are no norms yet. */
export type Band = 'lower' | 'middle' | 'higher';

/** Below LOWER_BELOW a trait is "lower", above HIGHER_ABOVE it is "higher", in between "middle". */
export const LOWER_BELOW = 40;
export const HIGHER_ABOVE = 60;
/** Aspects have only two descriptions: lower below 50, higher from 50. */
export const ASPECT_SPLIT = 50;

export interface BigFiveAspect {
  aspect: string;
  /** 0 to 100, unrounded: how far the answers went toward the high end. */
  pct: number;
}

export interface BigFiveTrait {
  trait: string;
  /** 0 to 100, unrounded. The two aspects' questions together. */
  pct: number;
  band: Band;
  aspects: BigFiveAspect[];
}

export interface BigFiveResult {
  version: string;
  traits: BigFiveTrait[];
  flags: Flag[];
}

export function bandOf(pct: number): Band {
  if (pct < LOWER_BELOW) return 'lower';
  if (pct > HIGHER_ABOVE) return 'higher';
  return 'middle';
}

export function aspectBand(pct: number): 'lower' | 'higher' {
  return pct < ASPECT_SPLIT ? 'lower' : 'higher';
}

export function getBigFiveQuestions(version: string): BigFiveQuestions | undefined {
  return version === b1.version ? b1 : undefined;
}

/** 0 to 100 for a set of questions. Reverse-keyed answers count from the other end. */
function scalePct(items: readonly BigFiveItem[], answers: Answers): number {
  if (items.length === 0) throw new ScoringError('A scale has no questions');
  let total = 0;
  for (const item of items) {
    const value = readAnswer(answers, item.id);
    total += item.keyed === '-' ? MIN_ANSWER + MAX_ANSWER - value : value;
  }
  const min = items.length * MIN_ANSWER;
  const max = items.length * MAX_ANSWER;
  // Multiply before dividing, as in scoring.ts, so the steps stay exact.
  return ((total - min) * 100) / (max - min);
}

/** Scores a full set of answers. Throws ScoringError if any answer is missing, unknown or invalid. */
export function scoreBigFive(questions: BigFiveQuestions, answers: Answers): BigFiveResult {
  const itemIds = new Set(questions.items.map((item) => item.id));
  for (const key of Object.keys(answers)) {
    if (!itemIds.has(key)) throw new ScoringError(`Unknown question ${key}`);
  }

  const traits = questions.axes.map((trait): BigFiveTrait => {
    const items = questions.items.filter((item) => item.axis === trait.id);
    const pct = scalePct(items, answers);
    return {
      trait: trait.id,
      pct,
      band: bandOf(pct),
      aspects: trait.aspects.map((aspect) => ({
        aspect: aspect.id,
        pct: scalePct(
          items.filter((item) => item.aspect === aspect.id),
          answers,
        ),
      })),
    };
  });

  const values = new Set(questions.items.map((item) => readAnswer(answers, item.id)));
  return { version: questions.version, traits, flags: values.size === 1 ? ['same_answers'] : [] };
}

/** A score as people read it: a whole number from 0 to 100. */
export function displayPct(pct: number): number {
  return Math.round(pct);
}
