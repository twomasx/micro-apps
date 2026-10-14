import { PHASE_WORDS, type Phase, type Technique } from './techniques';

/** A pattern you make yourself: seconds to breathe in, hold full, breathe out, hold empty. */
export interface CustomPattern {
  in: number;
  holdIn: number;
  out: number;
  holdOut: number;
}

export type CustomField = keyof CustomPattern;

export const CUSTOM_FIELDS: readonly CustomField[] = ['in', 'holdIn', 'out', 'holdOut'];
export const MAX_PHASE_SECONDS = 12;
/** Breathing in and out each take at least this long. Holds can be 0. */
export const MIN_BREATH_SECONDS = 2;
export const MAX_SAVED_PATTERNS = 5;
/** Seconds go in steps of this size. */
export const SECONDS_STEP = 0.5;
export const DEFAULT_CUSTOM: CustomPattern = { in: 4, holdIn: 2, out: 6, holdOut: 0 };

const HINTS: Record<CustomField, string> = {
  in: 'Through your nose',
  holdIn: 'Lungs full',
  out: 'Slow and even',
  holdOut: 'Lungs empty',
};

export interface CustomProblem {
  field: CustomField;
  message: string;
}

function minimum(field: CustomField): number {
  return field === 'in' || field === 'out' ? MIN_BREATH_SECONDS : 0;
}

/** Every reason this pattern can't be used, in plain words. Empty when it is fine. */
export function customProblems(pattern: CustomPattern): CustomProblem[] {
  const problems: CustomProblem[] = [];
  for (const field of CUSTOM_FIELDS) {
    const value = pattern[field];
    const min = minimum(field);
    const name = field === 'in' ? 'Breathing in' : field === 'out' ? 'Breathing out' : 'A hold';
    if (!Number.isFinite(value) || value < min || value > MAX_PHASE_SECONDS) {
      problems.push({ field, message: `${name} can be ${min} to ${MAX_PHASE_SECONDS} seconds.` });
    } else if (Math.round(value / SECONDS_STEP) * SECONDS_STEP !== value) {
      problems.push({ field, message: `${name} goes in steps of ${SECONDS_STEP} seconds.` });
    }
  }
  return problems;
}

export function isValidCustom(pattern: CustomPattern): boolean {
  return customProblems(pattern).length === 0;
}

/** Keeps a value inside the limits for its field and on the step. */
export function clampCustomValue(field: CustomField, value: number): number {
  if (!Number.isFinite(value)) return minimum(field);
  const stepped = Math.round(value / SECONDS_STEP) * SECONDS_STEP;
  return Math.min(MAX_PHASE_SECONDS, Math.max(minimum(field), stepped));
}

/** The name a saved pattern goes by: its numbers, like "4-2-6-0". */
export function customName(pattern: CustomPattern): string {
  return CUSTOM_FIELDS.map((field) => String(pattern[field])).join('-');
}

export function customId(pattern: CustomPattern): string {
  return `custom-${customName(pattern)}`;
}

/** A custom pattern as a technique the engine can run. Holds of 0 are left out. */
export function customToTechnique(pattern: CustomPattern): Technique {
  const phases: Phase[] = [];
  for (const field of CUSTOM_FIELDS) {
    const seconds = pattern[field];
    if (seconds <= 0) continue;
    const kind = field === 'in' ? 'in' : field === 'out' ? 'out' : 'hold';
    phases.push({ kind, ms: Math.round(seconds * 1000), word: PHASE_WORDS[kind], hint: HINTS[field] });
  }
  return {
    id: customId(pattern),
    name: customName(pattern),
    short: customName(pattern),
    free: false,
    wording: 'Your own pattern.',
    phases,
    evidence: null,
  };
}

/**
 * Adds a pattern to the saved list, newest first. Saving one that is already there moves it
 * to the front. The list holds at most MAX_SAVED_PATTERNS; returns null when it is full.
 */
export function addSavedPattern(saved: readonly CustomPattern[], pattern: CustomPattern): CustomPattern[] | null {
  const name = customName(pattern);
  const others = saved.filter((p) => customName(p) !== name);
  if (others.length >= MAX_SAVED_PATTERNS) return null;
  return [pattern, ...others];
}

export function removeSavedPattern(saved: readonly CustomPattern[], pattern: CustomPattern): CustomPattern[] {
  const name = customName(pattern);
  return saved.filter((p) => customName(p) !== name);
}

/** Turns whatever was in storage into valid saved patterns. */
export function sanitizeSavedPatterns(raw: unknown): CustomPattern[] {
  if (!Array.isArray(raw)) return [];
  const result: CustomPattern[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const record = item as Record<string, unknown>;
    const pattern = {
      in: Number(record.in),
      holdIn: Number(record.holdIn),
      out: Number(record.out),
      holdOut: Number(record.holdOut),
    };
    if (!isValidCustom(pattern) || result.some((p) => customName(p) === customName(pattern))) continue;
    result.push(pattern);
    if (result.length === MAX_SAVED_PATTERNS) break;
  }
  return result;
}
