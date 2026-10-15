import type { SessionRecord, StretchRecord, TestRecord } from './records';
import { scoreSart } from './sart-score';

/** Builders for tests. Not used by the app. */
export function session(date: string, overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: `s-${date}-${Math.random().toString(36).slice(2, 8)}`,
    startedAt: Date.parse(`${date}T09:00:00`),
    date,
    targetSeconds: 600,
    stretches: [stretch(20, true)],
    nextSeconds: 22,
    finished: true,
    ...overrides,
  };
}

export function stretch(seconds: number, stayed: boolean, probe: StretchRecord['probe'] = null): StretchRecord {
  return { seconds, stayed, probe };
}

export function test(afterPracticeDays: number, overrides: Partial<TestRecord> = {}): TestRecord {
  return {
    id: `t-${afterPracticeDays}`,
    takenAt: 1_000 + afterPracticeDays,
    date: '2026-10-15',
    length: 'quick',
    nth: 1,
    afterPracticeDays,
    score: scoreSart([]),
    trials: [],
    timing: null,
    ...overrides,
  };
}

/** A repeatable random source, so tests can check shuffles and probe plans. */
export function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
