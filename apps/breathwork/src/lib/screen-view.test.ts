import { describe, expect, it } from 'vitest';
import type { BreathSnapshot } from './breath-controller';
import { customToTechnique } from './custom';
import { breathCount, lengthLabel, noteText, nowText, startLabel } from './screen-view';
import { findTechnique } from './techniques';

const sigh = findTechnique('sigh')!;
const resonant = findTechnique('resonant')!;

function snapshot(patch: Partial<BreathSnapshot>): BreathSnapshot {
  return {
    technique: sigh,
    status: 'running',
    phaseIndex: 0,
    word: 'Inhale',
    hint: 'Through your nose',
    secondsLeft: 2,
    clock: '4:57',
    notice: null,
    muted: false,
    ...patch,
  };
}

const context = { technique: sigh, durationMs: 297_000, preview: false };

describe('nowText', () => {
  it('invites you to start', () => {
    expect(nowText(snapshot({ status: 'ready' }), context)).toEqual({
      word: 'Ready',
      hint: 'Press start, then follow the dot',
      count: null,
      kind: 'ready',
    });
  });

  it('shows the phase, its hint and the count while running', () => {
    expect(nowText(snapshot({ phaseIndex: 2, word: 'Exhale', hint: 'Slowly', secondsLeft: 6 }), context)).toEqual({
      word: 'Exhale',
      hint: 'Slowly',
      count: '6',
      kind: 'out',
    });
  });

  it('says paused, keeping the phase and count', () => {
    expect(nowText(snapshot({ status: 'paused' }), context)).toMatchObject({ word: 'Inhale', hint: 'Paused', count: '2' });
  });

  it('sums up a finished session in breaths and time', () => {
    expect(nowText(snapshot({ status: 'complete' }), context)).toEqual({
      word: 'Session complete',
      hint: '33 breaths in 4:57.',
      count: null,
      kind: 'done',
    });
  });

  it('ends a preview with what the unlock adds', () => {
    const result = nowText(snapshot({ status: 'complete' }), { technique: resonant, durationMs: 55_000, preview: true });
    expect(result.word).toBe('Preview over');
    expect(result.hint).toBe('Resonant is part of the lifetime unlock.');
  });
});

describe('labels', () => {
  it('names the big button for each status', () => {
    expect(startLabel('ready')).toBe('Start');
    expect(startLabel('running')).toBe('Pause');
    expect(startLabel('paused')).toBe('Resume');
    expect(startLabel('complete')).toBe('Again');
  });

  it('shows the wording, or the preview line for a locked technique', () => {
    expect(noteText(sigh, false)).toBe(sigh.wording);
    expect(noteText(resonant, true)).toBe('1 minute preview. Resonant is part of the lifetime unlock.');
    const custom = customToTechnique({ in: 4, holdIn: 2, out: 6, holdOut: 0 });
    expect(noteText(custom, true)).toBe('1 minute preview. Custom patterns are part of the lifetime unlock.');
    expect(noteText(custom, false)).toBe('4 s in, 2 s hold, 6 s out.');
  });

  it('labels the length', () => {
    expect(lengthLabel(5, false)).toBe('5 min');
    expect(lengthLabel(20, true)).toBe('1 min preview');
  });

  it('counts whole breaths', () => {
    expect(breathCount(297_000, sigh)).toBe(33);
    expect(breathCount(1000, sigh)).toBe(1);
  });
});
