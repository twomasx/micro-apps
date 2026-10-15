import { useEffect, useRef } from 'react';
import { createRunner, step, tap, timingReport, trialsOf, type RunnerState, type TimingReport } from '../lib/sart-runner';
import { practiceFeedback, type SartTrial } from '../lib/sart-score';
import { FONT_SCALES, type SartItem } from '../lib/sart-sequence';
import { PRACTICE_FEEDBACK } from '../lib/test-copy';

export interface SartRunOptions {
  items: readonly SartItem[];
  practice: boolean;
  onFinish: (trials: SartTrial[], timing: TimingReport) => void;
  /** The page was hidden: the run is thrown away. */
  onAbort: () => void;
}

/** Frames measured before trusting the estimate. */
const FRAME_SAMPLES = 30;

/**
 * Runs the test inside `stageRef`. Digits, mask and feedback are written straight to the DOM
 * on each animation frame, without a React render, so nothing sits between the clock and the
 * screen. Taps use the browser's own event time stamps.
 *
 * The stage needs children with these classes: .sart-digit, .sart-mask, .sart-feedback.
 * Its `data-show` says which one is visible.
 */
export function useSartRun(options: SartRunOptions) {
  const stageRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const digit = stage.querySelector<HTMLElement>('.sart-digit')!;
    const feedback = stage.querySelector<HTMLElement>('.sart-feedback')!;
    const { items, practice } = optionsRef.current;

    // Digit sizes are fractions of the largest, which fits the stage.
    const rect = stage.getBoundingClientRect();
    const largest = Math.min(rect.width * 0.6, rect.height * 0.45, 340);
    stage.style.setProperty('--sart-size', `${largest}px`);

    let state: RunnerState | null = null;
    let frame = 0;
    let last = 0;
    const deltas: number[] = [];
    let frameMs = 1000 / 60;
    let finished = false;

    const show = (s: RunnerState) => {
      stage.dataset.show = s.phase;
      if (s.phase === 'digit') {
        const item = s.items[s.index]!;
        digit.textContent = String(item.digit);
        digit.style.fontSize = `${largest * FONT_SCALES[item.size]!}px`;
      } else if (s.phase === 'feedback') {
        const trial = trialsOf(s)[s.index]!;
        const kind = practiceFeedback(trial);
        feedback.textContent = PRACTICE_FEEDBACK[kind];
        feedback.dataset.kind = kind;
      }
    };

    const loop = (t: number) => {
      if (last > 0) {
        deltas.push(t - last);
        if (deltas.length > FRAME_SAMPLES) deltas.shift();
        if (deltas.length >= 10) frameMs = [...deltas].sort((a, b) => a - b)[deltas.length >> 1]!;
      }
      last = t;
      state ??= createRunner(items, t, practice);
      const next = step(state, t, frameMs);
      if (next.phase !== state.phase || next.index !== state.index) show(next);
      state = next;
      if (state.phase === 'done') {
        finished = true;
        optionsRef.current.onFinish(trialsOf(state), timingReport(state));
        return;
      }
      frame = requestAnimationFrame(loop);
    };
    stage.dataset.show = 'lead';
    frame = requestAnimationFrame(loop);

    const onPointerDown = (event: PointerEvent) => {
      if ((event.target as HTMLElement).closest('button')) return;
      if (state) state = tap(state, event.timeStamp);
    };
    // Desktop: the space bar works as a tap.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || (event.key !== ' ' && event.key !== 'Enter')) return;
      if ((event.target as HTMLElement).closest('button')) return;
      event.preventDefault();
      if (state) state = tap(state, event.timeStamp);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden' && !finished) {
        cancelAnimationFrame(frame);
        finished = true;
        optionsRef.current.onAbort();
      }
    };
    stage.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      stage.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return stageRef;
}
