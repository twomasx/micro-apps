import { describe, expect, it } from 'vitest';
import {
  BEAT_MAX_HZ,
  BEAT_MIN_HZ,
  CARRIER_MAX_HZ,
  CARRIER_MIN_HZ,
  CUSTOM_CARRIER_HZ,
  DEFAULT_VOLUME,
  MAX_TONE_GAIN,
  clampBeat,
  customTone,
  earFrequencies,
  isValidTone,
  volumeToGain,
} from './frequencies';
import { findPreset, presets } from './presets';

describe('earFrequencies', () => {
  it('gives the left ear the carrier and the right ear the carrier plus the beat', () => {
    expect(earFrequencies({ carrier: 300, beat: 6 })).toEqual({ left: 300, right: 306 });
    expect(earFrequencies({ carrier: 400, beat: 40 })).toEqual({ left: 400, right: 440 });
  });

  it('makes the difference between the ears equal the beat for every preset', () => {
    for (const preset of presets) {
      const { left, right } = earFrequencies(preset);
      expect(right - left).toBe(preset.beat);
      expect(left).toBe(preset.carrier);
    }
  });
});

describe('presets', () => {
  it('has the five presets from the spec', () => {
    expect(presets.map((p) => [p.id, p.beat, p.carrier])).toEqual([
      ['sleep', 2, 250],
      ['calm', 6, 300],
      ['relaxed', 10, 300],
      ['focus', 18, 350],
      ['deep', 40, 400],
    ]);
  });

  it('keeps every carrier between 250 and 450 Hz and every beat between 1 and 40 Hz', () => {
    for (const preset of presets) expect(isValidTone(preset)).toBe(true);
  });

  it('makes Sleep, Calm and Focus free', () => {
    expect(presets.filter((p) => p.free).map((p) => p.id)).toEqual(['sleep', 'calm', 'focus']);
  });

  it('finds a preset by id', () => {
    expect(findPreset('deep')?.name).toBe('Deep focus');
    expect(findPreset('nope')).toBeUndefined();
  });
});

describe('isValidTone', () => {
  it('rejects carriers and beats outside the allowed range', () => {
    expect(isValidTone({ carrier: CARRIER_MIN_HZ, beat: BEAT_MIN_HZ })).toBe(true);
    expect(isValidTone({ carrier: CARRIER_MAX_HZ, beat: BEAT_MAX_HZ })).toBe(true);
    expect(isValidTone({ carrier: 249, beat: 10 })).toBe(false);
    expect(isValidTone({ carrier: 451, beat: 10 })).toBe(false);
    expect(isValidTone({ carrier: 300, beat: 0.5 })).toBe(false);
    expect(isValidTone({ carrier: 300, beat: 41 })).toBe(false);
    expect(isValidTone({ carrier: Number.NaN, beat: 10 })).toBe(false);
  });
});

describe('custom beat', () => {
  it('clamps to whole numbers from 1 to 40 Hz', () => {
    expect(clampBeat(0)).toBe(1);
    expect(clampBeat(-5)).toBe(1);
    expect(clampBeat(12.4)).toBe(12);
    expect(clampBeat(12.5)).toBe(13);
    expect(clampBeat(99)).toBe(40);
    expect(clampBeat(Number.NaN)).toBe(1);
  });

  it('uses a 300 Hz carrier', () => {
    expect(customTone(25)).toEqual({ carrier: CUSTOM_CARRIER_HZ, beat: 25 });
    expect(isValidTone(customTone(1000))).toBe(true);
  });
});

describe('volumeToGain', () => {
  it('is silent at 0 and reaches the cap at 1', () => {
    expect(volumeToGain(0)).toBe(0);
    expect(volumeToGain(1)).toBe(MAX_TONE_GAIN);
  });

  it('starts low at the default volume', () => {
    expect(DEFAULT_VOLUME).toBe(0.3);
    expect(volumeToGain(DEFAULT_VOLUME)).toBeCloseTo(0.0657, 3);
  });

  it('never goes above the cap or below zero', () => {
    expect(volumeToGain(5)).toBe(MAX_TONE_GAIN);
    expect(volumeToGain(-1)).toBe(0);
    expect(volumeToGain(Number.NaN)).toBe(0);
  });

  it('rises with the setting', () => {
    expect(volumeToGain(0.6)).toBeGreaterThan(volumeToGain(0.3));
  });
});
