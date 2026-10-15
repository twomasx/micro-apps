import { describe, expect, it } from 'vitest';
import { createRunner, FEEDBACK_MS, LEAD_MS, step, tap, targetOnset, timingReport, trialsOf, type RunnerState } from './sart-runner';
import type { SartItem } from './sart-sequence';

const items: SartItem[] = [
  { digit: 5, size: 0 },
  { digit: 3, size: 1 },
  { digit: 7, size: 2 },
];
const FRAME = 1000 / 60;

/** Steps frame by frame from `from` to `to`. */
function run(state: RunnerState, from: number, to: number, frame = FRAME): RunnerState {
  let s = state;
  for (let t = from; t <= to; t += frame) s = step(s, t, frame);
  return s;
}

describe('SART runner', () => {
  it('starts with a blank lead-in, then shows digit, mask, digit, mask', () => {
    let s = createRunner(items, 0);
    s = run(s, 0, LEAD_MS - 20);
    expect(s.phase).toBe('lead');
    s = run(s, LEAD_MS - 20 + FRAME, LEAD_MS + 100);
    expect(s).toMatchObject({ phase: 'digit', index: 0 });
    s = run(s, LEAD_MS + 100 + FRAME, LEAD_MS + 300);
    expect(s).toMatchObject({ phase: 'mask', index: 0 });
    s = run(s, LEAD_MS + 300 + FRAME, LEAD_MS + 1150 + 20);
    expect(s).toMatchObject({ phase: 'digit', index: 1 });
  });

  it('keeps each digit up for 250 ms and each trial at 1150 ms, within a frame, without drift', () => {
    const many: SartItem[] = Array.from({ length: 108 }, (_, i) => ({ digit: (i % 9) + 1, size: 0 }));
    const s = run(createRunner(many, 0), 0, LEAD_MS + 108 * 1150 + 100);
    expect(s.phase).toBe('done');
    const report = timingReport(s);
    expect(report.meanDigitMs).toBeGreaterThan(250 - FRAME / 2);
    expect(report.meanDigitMs).toBeLessThan(250 + FRAME / 2);
    expect(report.maxDigitErrorMs).toBeLessThanOrEqual(FRAME / 2 + 0.01);
    expect(report.meanSoaMs).toBeCloseTo(1150, 0);
    expect(report.maxOnsetErrorMs).toBeLessThanOrEqual(FRAME / 2 + 0.01);
  });

  it('holds its timing when frames come late and uneven', () => {
    const many: SartItem[] = Array.from({ length: 30 }, (_, i) => ({ digit: (i % 9) + 1, size: 0 }));
    let s = createRunner(many, 0);
    let t = 0;
    let k = 0;
    while (s.phase !== 'done' && t < 60_000) {
      t += k++ % 7 === 0 ? 33 : 16.7; // an occasional dropped frame
      s = step(s, t, FRAME);
    }
    expect(Math.abs(s.onsets[29]! - targetOnset(s, 29))).toBeLessThan(34);
  });

  it('records reaction times from the digit onset, for the digit on screen', () => {
    let s = run(createRunner(items, 0), 0, LEAD_MS + 10);
    const onset = s.onsets[0]!;
    s = tap(s, onset + 320);
    s = run(s, LEAD_MS + 10 + FRAME, LEAD_MS + 1150 + 10);
    s = tap(s, s.onsets[1]! + 40);
    expect(trialsOf(s).map((t) => t.taps)).toEqual([[320], [40]]);
  });

  it('gives a tap stamped just before a digit appeared to the one before', () => {
    let s = run(createRunner(items, 0), 0, LEAD_MS + 1150 + 10);
    s = tap(s, s.onsets[1]! - 3);
    expect(s.taps[0]).toEqual([Math.round(s.onsets[1]! - 3 - s.onsets[0]!)]);
    expect(s.taps[1]).toEqual([]);
  });

  it('ignores taps in the lead-in', () => {
    const s = tap(createRunner(items, 0), 500);
    expect(s.taps.flat()).toEqual([]);
  });

  it('adds a feedback pause after each practice digit, where taps do not count', () => {
    let s = run(createRunner(items, 0, true), 0, LEAD_MS + 250 + 900 + 50);
    expect(s).toMatchObject({ phase: 'feedback', index: 0 });
    s = tap(s, LEAD_MS + 1200);
    expect(s.taps[0]).toEqual([]);
    s = run(s, LEAD_MS + 1200 + FRAME, LEAD_MS + 1150 + FEEDBACK_MS + 10);
    expect(s).toMatchObject({ phase: 'digit', index: 1 });
  });

  it('ends one trial after the last digit', () => {
    const s = run(createRunner(items, 0), 0, LEAD_MS + 3 * 1150 + 20);
    expect(s.phase).toBe('done');
    expect(trialsOf(s)).toHaveLength(3);
  });
});
