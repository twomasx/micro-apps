import { describe, expect, it } from 'vitest';
import {
  createSession,
  elapsedMs,
  formatClock,
  isComplete,
  pauseSession,
  remainingMs,
  sessionStatus,
  startSession,
} from './session';

describe('session', () => {
  it('is ready before it starts', () => {
    const s = createSession(60_000);
    expect(sessionStatus(s, 1000)).toBe('ready');
    expect(elapsedMs(s, 99_999)).toBe(0);
  });

  it('counts real time from timestamps, not frames', () => {
    const s = startSession(createSession(60_000), 1000);
    expect(sessionStatus(s, 1000)).toBe('running');
    expect(elapsedMs(s, 31_000)).toBe(30_000);
    expect(remainingMs(s, 31_000)).toBe(30_000);
  });

  it('stops counting while paused and goes on from there', () => {
    let s = startSession(createSession(60_000), 0);
    s = pauseSession(s, 10_000);
    expect(sessionStatus(s, 50_000)).toBe('paused');
    expect(elapsedMs(s, 50_000)).toBe(10_000);
    s = startSession(s, 50_000);
    expect(elapsedMs(s, 55_000)).toBe(15_000);
  });

  it('remembers why it paused, and clears it on resume', () => {
    let s = pauseSession(startSession(createSession(60_000), 0), 5000, 'hidden');
    expect(s.pausedBy).toBe('hidden');
    s = startSession(s, 6000);
    expect(s.pausedBy).toBeNull();
    expect(pauseSession(s, 7000).pausedBy).toBe('user');
  });

  it('completes at its length and never counts past it', () => {
    const s = startSession(createSession(60_000), 0);
    expect(isComplete(s, 59_999)).toBe(false);
    expect(isComplete(s, 60_000)).toBe(true);
    expect(sessionStatus(s, 90_000)).toBe('complete');
    expect(elapsedMs(s, 90_000)).toBe(60_000);
  });

  it('ignores start when running or complete, and pause when not running', () => {
    const running = startSession(createSession(60_000), 0);
    expect(startSession(running, 5000)).toBe(running);
    const ready = createSession(60_000);
    expect(pauseSession(ready, 5000)).toBe(ready);
    const done = pauseSession(running, 70_000);
    expect(startSession(done, 80_000)).toBe(done);
  });

  it('does not run backwards if the clock does', () => {
    const s = startSession(createSession(60_000), 10_000);
    expect(elapsedMs(s, 5000)).toBe(0);
  });
});

describe('formatClock', () => {
  it('shows minutes and seconds, rounding up', () => {
    expect(formatClock(297_000)).toBe('4:57');
    expect(formatClock(1)).toBe('0:01');
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(-5)).toBe('0:00');
    expect(formatClock(20 * 60_000)).toBe('20:00');
  });
});
