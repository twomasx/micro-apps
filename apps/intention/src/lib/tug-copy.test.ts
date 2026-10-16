import { describe, expect, it } from 'vitest';
import { DEFAULT_PAIR } from './pairs.ts';
import type { RunResult, StartEvent } from './protocol.ts';
import type { RunSnapshot } from './run-session.ts';
import { tugText } from './tug-copy.ts';

const base: RunSnapshot = {
  phase: 'idle',
  start: null,
  n: 0,
  deviation: 0,
  end: null,
  stoppedBy: null,
  saved: null,
  error: null,
};
const start = (aim: 'left' | 'right'): StartEvent => ({
  runId: 'run0000000000001',
  aim,
  lengthBits: 4000,
  source: 'crypto',
  bitsPerSecond: 200,
});

describe('tug screen text', () => {
  it('before a run: the headline and Begin, no pill and no score', () => {
    const text = tugText(base, DEFAULT_PAIR, false);
    expect(text).toMatchObject({ headline: 'Pull your color across', headlineVisible: true, pill: null, score: null });
    expect(text.button).toBe('Begin');
  });

  it('names your real color and its direction', () => {
    const glacier = tugText({ ...base, phase: 'running', start: start('right') }, DEFAULT_PAIR, true);
    expect(glacier.headline).toBe('Pull Glacier across');
    expect(glacier.headlineVisible).toBe(true);
    expect(glacier.pill).toEqual({ name: 'Glacier', hex: '#7fc8e8', arrow: '←' });
    const ember = tugText({ ...base, phase: 'running', start: start('left') }, DEFAULT_PAIR, false);
    expect(ember.pill).toEqual({ name: 'Ember', hex: '#f2683c', arrow: '→' });
    expect(ember.headlineVisible).toBe(false);
    expect(ember.line).toBe('Hold Ember in mind and will it across.');
  });

  it('the live score is positive when the bits favor your color', () => {
    // 1s lead by 40 after 1,000 bits. They favor the right color.
    const right = tugText({ ...base, phase: 'running', start: start('right'), n: 1000, deviation: 40 }, DEFAULT_PAIR, false);
    const left = tugText({ ...base, phase: 'running', start: start('left'), n: 1000, deviation: 40 }, DEFAULT_PAIR, false);
    expect(right.score).toBe('+1.26');
    expect(left.score).toBe('−1.26');
  });

  it('a finished run gives the verdict', () => {
    const text = tugText(
      { ...base, phase: 'done', start: start('right'), n: 4000, deviation: 61, end: { status: 'complete', n: 4000, deviation: 61, z: 0.9645 } },
      DEFAULT_PAIR,
      false,
    );
    expect(text.score).toBe('+0.96');
    expect(text.line).toBe('About 1 in 6 runs pull this far toward Glacier by chance. Normal.');
    expect(text.button).toBe('Pull again');
  });

  it('a stopped run says it still counts and shows the recorded score', () => {
    const stopped = { ...base, phase: 'stopped' as const, start: start('right'), n: 1000, deviation: 40, stoppedBy: 'you' as const };
    const before = tugText(stopped, DEFAULT_PAIR, false);
    // Scored over the planned 4,000 bits: 40 ÷ √4000.
    expect(before.score).toBe('+0.63');
    expect(before.line).toBe('You stopped early. This run still counts, scored over its full 20 seconds.');
    const after = tugText({ ...stopped, saved: { z: 0.66 } as RunResult }, DEFAULT_PAIR, false);
    expect(after.score).toBe('+0.66');
    const dropped = tugText({ ...stopped, stoppedBy: 'connection' }, DEFAULT_PAIR, false);
    expect(dropped.line).toBe('The connection dropped. This run still counts, with the bits it had.');
  });
});
