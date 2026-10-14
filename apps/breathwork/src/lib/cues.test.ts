import { describe, expect, it, vi } from 'vitest';
import {
  CUES,
  cueDuration,
  cueFor,
  roomImpulse,
  scheduleBell,
  scheduleCue,
  scheduleHum,
  voiceHarmonics,
  type BellCue,
  type HumCue,
} from './cues';
import { VIBRATION_PATTERNS } from './haptics';

const hum = (kind: 'in' | 'inAgain' | 'hold' | 'out') => CUES[kind] as HumCue;

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

describe('the cues', () => {
  it('are a deep hum for every phase, in the range people chant in', () => {
    for (const kind of ['in', 'inAgain', 'hold', 'out'] as const) {
      const cue = hum(kind);
      expect(cue.type).toBe('hum');
      for (const hz of [cue.startHz, cue.endHz]) {
        expect(hz).toBeGreaterThanOrEqual(100);
        expect(hz).toBeLessThanOrEqual(170);
      }
    }
  });

  it('rise and open on the way in, stay level on a hold, sink and close on the way out', () => {
    expect(hum('in').endHz).toBeGreaterThan(hum('in').startHz);
    expect(hum('in').brightToHz).toBeGreaterThan(hum('in').brightFromHz);
    expect(hum('inAgain').endHz).toBeGreaterThan(hum('inAgain').startHz);
    expect(hum('hold').endHz).toBe(hum('hold').startHz);
    expect(hum('out').endHz).toBeLessThan(hum('out').startHz);
    expect(hum('out').brightToHz).toBeLessThan(hum('out').brightFromHz);
  });

  it('make breathing out the longest and softest, and a hold quieter still', () => {
    expect(hum('out').durationS).toBeGreaterThan(hum('in').durationS);
    expect(hum('out').attackS).toBeGreaterThan(hum('in').attackS);
    expect(hum('out').peak).toBeLessThan(hum('in').peak);
    expect(hum('hold').peak).toBeLessThan(hum('out').peak);
  });

  it('keep the end-of-session bell as it was', () => {
    expect(CUES.done).toEqual({ type: 'bell', startHz: 392, endHz: 392, durationS: 1.6, attackS: 0.1, peak: 0.12 });
  });

  it('every cue has a vibration pattern too', () => {
    expect(Object.keys(VIBRATION_PATTERNS).sort()).toEqual(Object.keys(CUES).sort());
  });
});

describe('cueDuration', () => {
  it('never outlasts a short phase', () => {
    expect(cueDuration(CUES.in, 4)).toBe(1.8);
    expect(cueDuration(CUES.inAgain, 1)).toBe(0.9);
    expect(cueDuration(CUES.hold, 0.5)).toBe(0.45);
    expect(cueDuration(CUES.done)).toBe(1.6);
    expect(cueDuration(CUES.out, Number.NaN)).toBe(2.6);
  });
});

describe('voiceHarmonics', () => {
  it('has every overtone, fading, with a lift where a chanting voice carries', () => {
    const a = voiceHarmonics(16);
    expect(a).toHaveLength(17);
    expect(a[0]).toBe(0);
    expect(a[1]).toBe(1);
    expect(a[3]!).toBeGreaterThan(a[2]!);
    expect(a[16]!).toBeLessThan(a[6]!);
    expect(a[6]!).toBeLessThan(a[5]!);
  });
});

function param() {
  return {
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };
}

type FakeParam = ReturnType<typeof param>;

interface FakeOscillator {
  type: string;
  frequency: FakeParam;
  detune: FakeParam;
  setPeriodicWave: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  onended: null | (() => void);
}

function fakeContext() {
  const oscillators: FakeOscillator[] = [];
  const nodes: { disconnect: ReturnType<typeof vi.fn> }[] = [];
  function makeOscillator(): FakeOscillator {
    const osc: FakeOscillator = {
      type: '',
      frequency: param(),
      detune: param(),
      setPeriodicWave: vi.fn(),
      connect: vi.fn((node: unknown) => node),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null,
    };
    oscillators.push(osc);
    nodes.push(osc);
    return osc;
  }
  function makeNode<T extends object>(extra: T) {
    const node = { ...extra, connect: vi.fn((next: unknown) => next), disconnect: vi.fn() };
    nodes.push(node);
    return node;
  }
  const gains: ReturnType<typeof makeNode<{ gain: ReturnType<typeof param> }>>[] = [];
  const filters: ReturnType<typeof makeNode<{ type: string; Q: { value: number }; frequency: ReturnType<typeof param> }>>[] = [];
  const ctx = {
    currentTime: 10,
    sampleRate: 1000,
    createOscillator: makeOscillator,
    createGain: () => {
      const g = makeNode({ gain: param() });
      gains.push(g);
      return g;
    },
    createBiquadFilter: () => {
      const f = makeNode({ type: '', Q: { value: 0 }, frequency: param() });
      filters.push(f);
      return f;
    },
  };
  return { ctx: ctx as unknown as BaseAudioContext, oscillators, gains, filters, nodes };
}

describe('scheduleHum', () => {
  it('sings two detuned voices and a low octave through a moving vowel, then cleans up', () => {
    const { ctx, oscillators, gains, filters, nodes } = fakeContext();
    const wave = {} as PeriodicWave;
    scheduleHum(ctx, {} as AudioNode, hum('in'), 0.5, wave);

    // vibrato, two voices, low octave
    expect(oscillators).toHaveLength(4);
    const [vibrato, voiceA, voiceB, low] = oscillators;
    expect(vibrato!.frequency.value).toBeCloseTo(4.8);
    expect(voiceA!.setPeriodicWave).toHaveBeenCalledWith(wave);
    expect(voiceA!.detune.value).toBe(-7);
    expect(voiceB!.detune.value).toBe(7);
    expect(low!.type).toBe('sine');
    expect(voiceA!.frequency.setValueAtTime).toHaveBeenCalledWith(110, 10.01);
    expect(voiceA!.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(146.83, 10.91);
    expect(low!.frequency.setValueAtTime).toHaveBeenCalledWith(55, 10.01);

    const vowel = filters[0]!;
    expect(vowel.type).toBe('lowpass');
    expect(vowel.frequency.setValueAtTime).toHaveBeenCalledWith(550, 10.01);
    expect(vowel.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(1400, expect.closeTo(11.81, 5));

    const amp = gains[0]!;
    expect(amp.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.13, expect.closeTo(10.36, 5));
    expect(amp.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.0001, expect.closeTo(11.81, 5));

    for (const osc of oscillators) expect(osc.stop).toHaveBeenCalledWith(expect.closeTo(11.86, 5));
    low!.onended?.();
    for (const node of nodes) expect(node.disconnect).toHaveBeenCalled();
  });

  it('keeps a level note level and shortens to fit a short phase', () => {
    const { ctx, oscillators, filters } = fakeContext();
    scheduleHum(ctx, {} as AudioNode, hum('hold'), 1, {} as PeriodicWave, 0.45);
    expect(oscillators[1]!.frequency.exponentialRampToValueAtTime).not.toHaveBeenCalled();
    expect(filters[0]!.frequency.exponentialRampToValueAtTime).not.toHaveBeenCalled();
    expect(oscillators[1]!.stop).toHaveBeenCalledWith(expect.closeTo(10.51, 5));
  });
});

describe('scheduleBell', () => {
  it('fades in and out on one sine note and stops itself', () => {
    const { ctx, oscillators, gains } = fakeContext();
    scheduleBell(ctx, {} as AudioNode, CUES.done as BellCue, 0.5);
    expect(oscillators).toHaveLength(1);
    expect(oscillators[0]!.type).toBe('sine');
    expect(oscillators[0]!.frequency.setValueAtTime).toHaveBeenCalledWith(392, 10.01);
    expect(gains[0]!.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.06, expect.closeTo(10.11, 5));
    expect(oscillators[0]!.stop).toHaveBeenCalledWith(expect.closeTo(11.66, 5));
  });
});

describe('scheduleCue', () => {
  it('plays the bell for done and a hum for the phases', () => {
    const bell = fakeContext();
    scheduleCue(bell.ctx, {} as AudioNode, 'done', 1, {} as PeriodicWave);
    expect(bell.oscillators).toHaveLength(1);
    const voice = fakeContext();
    scheduleCue(voice.ctx, {} as AudioNode, 'out', 1, {} as PeriodicWave, 6);
    expect(voice.oscillators).toHaveLength(4);
  });
});

describe('roomImpulse', () => {
  it('is two channels of noise that fade to silence', () => {
    const channels = [new Float32Array(2000), new Float32Array(2000)];
    const ctx = {
      sampleRate: 1000,
      createBuffer: (count: number, length: number) => ({
        numberOfChannels: count,
        length,
        getChannelData: (c: number) => channels[c]!,
      }),
    } as unknown as BaseAudioContext;
    const buffer = roomImpulse(ctx, 2, () => 1);
    expect(buffer.length).toBe(2000);
    expect(channels[0]![0]).toBe(1);
    expect(channels[1]![1000]).toBeCloseTo(0.125);
    expect(Math.abs(channels[0]![1999]!)).toBeLessThan(1e-6);
  });
});
