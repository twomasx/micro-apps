import { describe, expect, it, vi } from 'vitest';
import { CUE_TONES, cueFor, scheduleTone } from './cues';
import { VIBRATION_PATTERNS } from './haptics';

describe('cueFor', () => {
  it('gives in, hold and out their own cue', () => {
    expect(cueFor({ kind: 'in' }, { kind: 'out' })).toBe('in');
    expect(cueFor({ kind: 'hold' }, { kind: 'in' })).toBe('hold');
    expect(cueFor({ kind: 'out' }, { kind: 'hold' })).toBe('out');
    expect(cueFor({ kind: 'in' }, null)).toBe('in');
  });

  it('gives the top-up breath of the cyclic sigh its own cue', () => {
    expect(cueFor({ kind: 'in' }, { kind: 'in' })).toBe('inAgain');
  });
});

describe('cue tones', () => {
  it('rise for in, stay level for hold, fall for out', () => {
    expect(CUE_TONES.in.endHz).toBeGreaterThan(CUE_TONES.in.startHz);
    expect(CUE_TONES.inAgain.endHz).toBeGreaterThan(CUE_TONES.inAgain.startHz);
    expect(CUE_TONES.hold.endHz).toBe(CUE_TONES.hold.startHz);
    expect(CUE_TONES.out.endHz).toBeLessThan(CUE_TONES.out.startHz);
  });

  it('are short, quiet and in a comfortable pitch range', () => {
    for (const tone of Object.values(CUE_TONES)) {
      expect(tone.durationS).toBeLessThanOrEqual(2);
      expect(tone.peak).toBeLessThanOrEqual(0.2);
      expect(tone.attackS).toBeLessThan(tone.durationS);
      expect(tone.startHz).toBeGreaterThanOrEqual(300);
      expect(tone.endHz).toBeLessThanOrEqual(800);
    }
  });

  it('make breathing out slower and softer than breathing in', () => {
    expect(CUE_TONES.out.durationS).toBeGreaterThan(CUE_TONES.in.durationS);
    expect(CUE_TONES.out.attackS).toBeGreaterThan(CUE_TONES.in.attackS);
    expect(CUE_TONES.out.peak).toBeLessThan(CUE_TONES.in.peak);
  });

  it('every cue has a vibration pattern too', () => {
    expect(Object.keys(VIBRATION_PATTERNS).sort()).toEqual(Object.keys(CUE_TONES).sort());
  });
});

describe('scheduleTone', () => {
  function fakeContext() {
    const param = () => ({
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    });
    const oscillator = {
      type: '',
      frequency: param(),
      connect: vi.fn((node: unknown) => node),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as null | (() => void),
    };
    const gain = { gain: param(), connect: vi.fn((node: unknown) => node), disconnect: vi.fn() };
    const ctx = { currentTime: 10, createOscillator: () => oscillator, createGain: () => gain };
    return { ctx: ctx as unknown as BaseAudioContext, oscillator, gain };
  }

  it('fades in, glides the pitch, fades out and stops itself', () => {
    const { ctx, oscillator, gain } = fakeContext();
    const destination = {} as AudioNode;
    scheduleTone(ctx, destination, CUE_TONES.in, 0.5);
    expect(oscillator.type).toBe('sine');
    expect(oscillator.frequency.setValueAtTime).toHaveBeenCalledWith(440, 10.01);
    expect(oscillator.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(587, 10.41);
    expect(gain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.08, expect.closeTo(10.05, 5));
    expect(gain.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.0001, 10.41);
    expect(gain.connect).toHaveBeenCalledWith(destination);
    expect(oscillator.stop).toHaveBeenCalledWith(expect.closeTo(10.46, 5));
    oscillator.onended?.();
    expect(oscillator.disconnect).toHaveBeenCalled();
    expect(gain.disconnect).toHaveBeenCalled();
  });

  it('keeps a level pitch level', () => {
    const { ctx, oscillator } = fakeContext();
    scheduleTone(ctx, {} as AudioNode, CUE_TONES.hold, 1);
    expect(oscillator.frequency.exponentialRampToValueAtTime).not.toHaveBeenCalled();
  });
});
