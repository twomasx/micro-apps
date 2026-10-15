import type { TestRecord } from './records';
import type { TimingReport } from './sart-runner';
import { scoreSart, type SartLength, type SartTrial } from './sart-score';

/** A hard cap: weekly tests plus extras for years. */
export const MAX_TESTS = 500;

/** Which number test of this length this is on this device: 1 for the first. */
export function nthTest(tests: readonly TestRecord[], length: SartLength): number {
  return tests.filter((t) => t.length === length).length + 1;
}

export function buildTestRecord(input: {
  id: string;
  takenAt: number;
  date: string;
  length: SartLength;
  trials: SartTrial[];
  timing: TimingReport | null;
  tests: readonly TestRecord[];
  completedDays: number;
}): TestRecord {
  return {
    id: input.id,
    takenAt: input.takenAt,
    date: input.date,
    length: input.length,
    nth: nthTest(input.tests, input.length),
    afterPracticeDays: input.completedDays,
    score: scoreSart(input.trials),
    trials: input.trials,
    timing: input.timing,
  };
}

/** Earlier results of the same length, oldest first. Used for "compare with your first few". */
export function earlierResults(tests: readonly TestRecord[], record: TestRecord): TestRecord[] {
  return tests.filter((t) => t.length === record.length && t.takenAt < record.takenAt).sort((a, b) => a.takenAt - b.takenAt);
}

function isNumberOrNull(x: unknown): x is number | null {
  return x === null || (typeof x === 'number' && Number.isFinite(x));
}

function sanitizeTrial(raw: unknown): SartTrial | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.digit !== 'number' || typeof r.size !== 'number' || !Array.isArray(r.taps)) return null;
  return { digit: r.digit, size: r.size, taps: r.taps.filter((t): t is number => typeof t === 'number') };
}

function sanitizeTest(raw: unknown): TestRecord | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.takenAt !== 'number' || typeof r.date !== 'string') return null;
  if (r.length !== 'quick' && r.length !== 'full') return null;
  if (!Array.isArray(r.trials)) return null;
  const trials = r.trials.map(sanitizeTrial).filter((t): t is SartTrial => t !== null);
  // The score is worked out again from the digits, so a stored score can never disagree with them.
  const score = scoreSart(trials);
  const timing = r.timing as Record<string, unknown> | null | undefined;
  return {
    id: r.id,
    takenAt: r.takenAt,
    date: r.date,
    length: r.length,
    nth: typeof r.nth === 'number' ? r.nth : 1,
    afterPracticeDays: typeof r.afterPracticeDays === 'number' ? r.afterPracticeDays : 0,
    score,
    trials,
    timing:
      timing &&
      isNumberOrNull(timing.meanDigitMs) &&
      isNumberOrNull(timing.maxDigitErrorMs) &&
      isNumberOrNull(timing.meanSoaMs) &&
      isNumberOrNull(timing.maxOnsetErrorMs)
        ? (timing as unknown as TestRecord['timing'])
        : null,
  };
}

export function sanitizeTests(raw: unknown): TestRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(sanitizeTest)
    .filter((t): t is TestRecord => t !== null)
    .sort((a, b) => a.takenAt - b.takenAt);
}

export function addTest(tests: readonly TestRecord[], record: TestRecord): TestRecord[] {
  return [...tests.filter((t) => t.id !== record.id), record].sort((a, b) => a.takenAt - b.takenAt).slice(-MAX_TESTS);
}
