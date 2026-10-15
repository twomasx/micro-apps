import { describe, expect, it } from 'vitest';
import {
  initialSession,
  planStretch,
  PROBE_MARGIN_SECONDS,
  sessionReducer,
  stretchElapsed,
  summarize,
  toRecord,
  type SessionAction,
  type SessionState,
} from './session';
import { seeded, stretch } from './testing';

const noProbe = { seconds: 20, probeAtSeconds: null };

function run(state: SessionState, ...actions: SessionAction[]): SessionState {
  return actions.reduce(sessionReducer, state);
}

describe('session loop', () => {
  it('runs begin, bell, answer and rest', () => {
    let s = initialSession(20, 600);
    s = run(s, { type: 'begin', now: 0, plan: noProbe });
    expect(s.phase).toBe('stretch');
    s = run(s, { type: 'bell' });
    expect(s.phase).toBe('ask');
    s = run(s, { type: 'answer', stayed: true });
    expect(s.phase).toBe('rest');
    expect(s.focusSeconds).toBe(20);
    expect(s.nextSeconds).toBe(22);
    expect(s.stretches).toEqual([stretch(20, true)]);
  });

  it('ignores answers outside the question', () => {
    const s = initialSession(20, 600);
    expect(run(s, { type: 'answer', stayed: true })).toBe(s);
  });

  it('counts focus time, not clock time, and ends after the stretch that reaches the target', () => {
    let s = initialSession(20, 60);
    for (const stayed of [true, true]) {
      s = run(s, { type: 'begin', now: 0, plan: noProbe }, { type: 'bell' }, { type: 'answer', stayed });
    }
    expect(s.focusSeconds).toBe(42);
    expect(s.phase).toBe('rest');
    s = run(s, { type: 'begin', now: 0, plan: noProbe }, { type: 'bell' }, { type: 'answer', stayed: false });
    expect(s.focusSeconds).toBe(66);
    expect(s.phase).toBe('done');
  });

  it('throws away a stretch cut off by leaving the page, and resumes at the same length', () => {
    let s = run(initialSession(30, 600), { type: 'begin', now: 0, plan: noProbe }, { type: 'hide' });
    expect(s.phase).toBe('paused');
    expect(s.interrupted).toBe(true);
    expect(s.focusSeconds).toBe(0);
    expect(s.stretches).toEqual([]);
    s = run(s, { type: 'begin', now: 5, plan: noProbe });
    expect(s.current?.seconds).toBe(30);
  });

  it('keeps the question open if the page is hidden while asking', () => {
    const s = run(initialSession(20, 600), { type: 'begin', now: 0, plan: noProbe }, { type: 'bell' }, { type: 'hide' });
    expect(s.phase).toBe('ask');
  });

  it('can be ended early', () => {
    const s = run(initialSession(20, 600), { type: 'begin', now: 0, plan: noProbe }, { type: 'end' });
    expect(s.phase).toBe('done');
    expect(s.current).toBeNull();
  });
});

describe('tick probes', () => {
  const probed = { seconds: 20, probeAtSeconds: 8 };

  it('counts a tap after the tick as heard', () => {
    const s = run(
      initialSession(20, 600),
      { type: 'begin', now: 0, plan: probed },
      { type: 'tap' },
      { type: 'probePlayed' },
      { type: 'tap' },
      { type: 'bell' },
      { type: 'answer', stayed: false },
    );
    expect(s.stretches[0]!.probe).toEqual({ atSeconds: 8, heard: true, earlyTaps: 1 });
  });

  it('records a missed tick', () => {
    const s = run(
      initialSession(20, 600),
      { type: 'begin', now: 0, plan: probed },
      { type: 'probePlayed' },
      { type: 'bell' },
      { type: 'answer', stayed: true },
    );
    expect(s.stretches[0]!.probe?.heard).toBe(false);
  });

  it('never changes the stretch length', () => {
    const heard = run(
      initialSession(20, 600),
      { type: 'begin', now: 0, plan: probed },
      { type: 'probePlayed' },
      { type: 'tap' },
      { type: 'bell' },
      { type: 'answer', stayed: true },
    );
    expect(heard.nextSeconds).toBe(22);
  });

  it('ignores taps in stretches without a tick', () => {
    const s = run(initialSession(20, 600), { type: 'begin', now: 0, plan: noProbe }, { type: 'tap' });
    expect(s.current?.earlyTaps).toBe(0);
  });

  it('plays in about 1 in 4 stretches, never in the first or last 3 s', () => {
    const random = seeded(7);
    let probes = 0;
    for (let i = 0; i < 4000; i++) {
      const plan = planStretch(10, true, random);
      if (plan.probeAtSeconds !== null) {
        probes++;
        expect(plan.probeAtSeconds).toBeGreaterThanOrEqual(PROBE_MARGIN_SECONDS);
        expect(plan.probeAtSeconds).toBeLessThanOrEqual(10 - PROBE_MARGIN_SECONDS);
      }
    }
    expect(probes / 4000).toBeGreaterThan(0.22);
    expect(probes / 4000).toBeLessThan(0.28);
  });

  it('never plays when switched off', () => {
    const random = seeded(1);
    for (let i = 0; i < 200; i++) expect(planStretch(60, false, random).probeAtSeconds).toBeNull();
  });

  it('drops a planned tick that no longer fits the stretch', () => {
    const s = run(initialSession(10, 600), { type: 'begin', now: 0, plan: { seconds: 60, probeAtSeconds: 40 } });
    expect(s.current?.probeAtSeconds).toBeNull();
  });
});

describe('summaries and records', () => {
  it('measures elapsed time within the stretch', () => {
    const s = run(initialSession(20, 600), { type: 'begin', now: 1_000, plan: noProbe });
    expect(stretchElapsed(s.current!, 6_000)).toBe(5);
    expect(stretchElapsed(s.current!, 99_000)).toBe(20);
  });

  it('summarizes focus time, longest held stretch and probes', () => {
    const summary = summarize([
      stretch(20, true, { atSeconds: 5, heard: true, earlyTaps: 0 }),
      stretch(22, false, { atSeconds: 9, heard: false, earlyTaps: 0 }),
      stretch(18, true),
    ]);
    expect(summary).toEqual({
      focusSeconds: 60,
      stretches: 3,
      stayed: 2,
      longestStayedSeconds: 20,
      probesPlayed: 2,
      probesHeard: 1,
    });
  });

  it('saves nothing when no stretch was answered', () => {
    expect(toRecord(initialSession(20, 600), { id: 'x', startedAt: 0, date: '2026-10-15' })).toBeNull();
  });

  it('saves the level to start from next time', () => {
    const s = run(initialSession(20, 600), { type: 'begin', now: 0, plan: noProbe }, { type: 'bell' }, { type: 'answer', stayed: true });
    expect(toRecord(s, { id: 'x', startedAt: 0, date: '2026-10-15' })).toMatchObject({ nextSeconds: 22, finished: false });
  });
});
