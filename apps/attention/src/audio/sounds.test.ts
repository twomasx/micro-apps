import { afterEach, describe, expect, it, vi } from 'vitest';
import { BELL, createSoundPlayer, peakGain, soundSeconds, TICK, TOK } from './sounds';

describe('sounds', () => {
  it('makes the tok low and short, around 196 Hz', () => {
    expect(TOK.partials[0]![0]).toBe(196);
    expect(soundSeconds('tok')).toBeLessThan(0.5);
  });

  it('lets the bell ring for about 2 seconds, above the tok', () => {
    expect(soundSeconds('bell')).toBeGreaterThanOrEqual(1.8);
    expect(soundSeconds('bell')).toBeLessThanOrEqual(2.5);
    expect(BELL.baseHz).toBeGreaterThan(TOK.partials[0]![0] * 2);
  });

  it('keeps the tick very short and much quieter than both', () => {
    expect(soundSeconds('tick')).toBeLessThan(0.03);
    expect(TICK.level).toBeLessThan(TOK.level / 4);
    expect(TICK.level).toBeLessThan(BELL.level / 2);
  });

  it('uses one volume for all three, silent at 0', () => {
    for (const name of ['tok', 'bell', 'tick'] as const) {
      expect(peakGain(name, 0)).toBe(0);
      expect(peakGain(name, 1)).toBeGreaterThan(peakGain(name, 0.5));
    }
    expect(peakGain('tok', 0.5) / peakGain('tok', 1)).toBeCloseTo(peakGain('tick', 0.5) / peakGain('tick', 1));
  });

  it('clamps the volume', () => {
    expect(peakGain('bell', 3)).toBe(peakGain('bell', 1));
    expect(peakGain('bell', -1)).toBe(0);
  });
});

describe('sound player', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  class FakeContext {
    static made: FakeContext[] = [];
    state: AudioContextState = 'running';
    destination = {};
    constructor() {
      FakeContext.made.push(this);
    }
    createDynamicsCompressor() {
      return { threshold: { value: 0 }, ratio: { value: 0 }, connect: () => undefined };
    }
    resume() {
      return Promise.resolve();
    }
    close() {
      this.state = 'closed';
      return Promise.resolve();
    }
  }

  it('closes its audio context, and makes a new one if asked again', async () => {
    FakeContext.made = [];
    vi.stubGlobal('AudioContext', FakeContext);
    vi.stubGlobal('window', { AudioContext: FakeContext });
    const player = createSoundPlayer(0.8);
    await player.prepare();
    expect(player.state).toBe('running');
    player.close();
    expect(FakeContext.made[0]!.state).toBe('closed');
    expect(player.state).toBe('none');
    player.close();
    await player.prepare();
    expect(FakeContext.made).toHaveLength(2);
  });
});
