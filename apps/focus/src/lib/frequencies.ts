export const CARRIER_MIN_HZ = 250;
export const CARRIER_MAX_HZ = 450;
export const BEAT_MIN_HZ = 1;
export const BEAT_MAX_HZ = 40;
/** Left ear frequency for a custom beat rate. */
export const CUSTOM_CARRIER_HZ = 300;

export const DEFAULT_VOLUME = 0.3;
/** Gain per ear at 100% volume. Kept well below full scale so the top of the slider is still comfortable. */
export const MAX_TONE_GAIN = 0.4;
/** Gain of the noise layer at 100% noise volume. The noise sits under the tones. */
export const MAX_NOISE_GAIN = 0.3;

export interface Tone {
  /** Left ear frequency in Hz. */
  carrier: number;
  /** Beat rate in Hz. */
  beat: number;
}

export interface EarFrequencies {
  left: number;
  right: number;
}

/** Left ear gets the carrier. Right ear gets the carrier plus the beat. */
export function earFrequencies(tone: Tone): EarFrequencies {
  return { left: tone.carrier, right: tone.carrier + tone.beat };
}

export function isValidTone(tone: Tone): boolean {
  return (
    Number.isFinite(tone.carrier) &&
    Number.isFinite(tone.beat) &&
    tone.carrier >= CARRIER_MIN_HZ &&
    tone.carrier <= CARRIER_MAX_HZ &&
    tone.beat >= BEAT_MIN_HZ &&
    tone.beat <= BEAT_MAX_HZ
  );
}

/** Custom beat rates are whole numbers from 1 to 40 Hz. */
export function clampBeat(beat: number): number {
  if (!Number.isFinite(beat)) return BEAT_MIN_HZ;
  return Math.min(BEAT_MAX_HZ, Math.max(BEAT_MIN_HZ, Math.round(beat)));
}

export function customTone(beat: number): Tone {
  return { carrier: CUSTOM_CARRIER_HZ, beat: clampBeat(beat) };
}

/**
 * Maps a 0 to 1 volume setting to a gain. The curve is steeper than linear
 * because loudness is not linear in gain: the low end of the slider stays usable.
 */
export function volumeToGain(volume: number, maxGain: number = MAX_TONE_GAIN): number {
  if (!Number.isFinite(volume)) return 0;
  const clamped = Math.min(1, Math.max(0, volume));
  return maxGain * clamped ** 1.5;
}
