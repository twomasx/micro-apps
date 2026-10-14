import { describe, expect, it } from 'vitest';
import {
  createTimer,
  elapsedMs,
  formatClock,
  isComplete,
  isRunning,
  pauseTimer,
  progress,
  remainingMs,
  startTimer,
} from './timer';

const MINUTE = 60_000;
const T0 = 1_760_000_000_000;

describe('session timer', () => {
  it('starts with the full session left and not running', () => {
    const timer = createTimer(10 * MINUTE);
    expect(isRunning(timer)).toBe(false);
    expect(remainingMs(timer, T0)).toBe(10 * MINUTE);
    expect(progress(timer, T0)).toBe(0);
  });

  it('counts real elapsed time, however far apart the readings are', () => {
    const timer = startTimer(createTimer(10 * MINUTE), T0);
    // One reading after the screen was off for 7 minutes: no ticks happened in between.
    expect(elapsedMs(timer, T0 + 7 * MINUTE)).toBe(7 * MINUTE);
    expect(remainingMs(timer, T0 + 7 * MINUTE)).toBe(3 * MINUTE);
    expect(progress(timer, T0 + 5 * MINUTE)).toBe(0.5);
  });

  it('does not count time while paused', () => {
    let timer = startTimer(createTimer(10 * MINUTE), T0);
    timer = pauseTimer(timer, T0 + 2 * MINUTE);
    expect(isRunning(timer)).toBe(false);
    expect(elapsedMs(timer, T0 + 30 * MINUTE)).toBe(2 * MINUTE);

    timer = startTimer(timer, T0 + 30 * MINUTE);
    expect(elapsedMs(timer, T0 + 33 * MINUTE)).toBe(5 * MINUTE);
  });

  it('stops at the session length', () => {
    const timer = startTimer(createTimer(10 * MINUTE), T0);
    expect(isComplete(timer, T0 + 10 * MINUTE - 1)).toBe(false);
    expect(isComplete(timer, T0 + 10 * MINUTE)).toBe(true);
    expect(elapsedMs(timer, T0 + 3 * 60 * MINUTE)).toBe(10 * MINUTE);
    expect(remainingMs(timer, T0 + 3 * 60 * MINUTE)).toBe(0);
    expect(progress(timer, T0 + 3 * 60 * MINUTE)).toBe(1);
  });

  it('does not restart a finished session', () => {
    const done = pauseTimer(startTimer(createTimer(MINUTE), T0), T0 + 2 * MINUTE);
    expect(startTimer(done, T0 + 5 * MINUTE)).toBe(done);
  });

  it('ignores a second start and a second pause', () => {
    const running = startTimer(createTimer(10 * MINUTE), T0);
    expect(startTimer(running, T0 + MINUTE)).toBe(running);
    const paused = pauseTimer(running, T0 + MINUTE);
    expect(pauseTimer(paused, T0 + 2 * MINUTE)).toBe(paused);
  });

  it('does not go backwards if the clock is set back', () => {
    const timer = startTimer(createTimer(10 * MINUTE), T0);
    expect(elapsedMs(timer, T0 - MINUTE)).toBe(0);
  });
});

describe('formatClock', () => {
  it('shows minutes and seconds left', () => {
    expect(formatClock(10 * MINUTE)).toBe('10:00');
    expect(formatClock(9 * MINUTE + 5000)).toBe('09:05');
    expect(formatClock(90 * MINUTE)).toBe('90:00');
  });

  it('rounds up so 00:00 only shows when the session is over', () => {
    expect(formatClock(400)).toBe('00:01');
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(-50)).toBe('00:00');
  });
});
