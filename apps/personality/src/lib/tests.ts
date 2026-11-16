// The tests this app offers. The test flow (useTest, progress) works with any of them; scoring, results and
// reports dispatch on the kind. Old results keep the version they were scored with.
import { BIG_FIVE_VERSION, bigFiveQuestions } from './big-five-test.ts';
import { currentQuestions, getQuestions } from './questions.ts';

export type TestKind = 'type' | 'big-five';

/** What the test flow needs from any question file. */
export interface TestQuestions {
  testId: string;
  version: string;
  instructions: string;
  scale: readonly { value: number; label: string }[];
  /** The scales the progress lines count: the four axes, or the five traits. */
  axes: readonly { id: string }[];
  items: readonly { id: string; axis: string; text: string }[];
}

export interface TestInfo {
  kind: TestKind;
  /** The version new tests of this kind are taken with. */
  questions: TestQuestions;
  /** The test's intro page under the app's base path: '' or 'big-five/'. Its questions are at `${path}test`. */
  path: string;
}

export const TESTS: Readonly<Record<TestKind, TestInfo>> = {
  type: { kind: 'type', questions: currentQuestions, path: '' },
  'big-five': { kind: 'big-five', questions: bigFiveQuestions, path: 'big-five/' },
};

/** Which test a stored version belongs to, or null for a version this app does not know. */
export function kindOf(version: string): TestKind | null {
  if (getQuestions(version)) return 'type';
  if (version === BIG_FIVE_VERSION) return 'big-five';
  return null;
}
