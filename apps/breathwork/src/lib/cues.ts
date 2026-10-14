import type { Phase } from './techniques';

/**
 * Sound cues, so the app works with your eyes closed. Generated with Web Audio; no audio files
 * and no sound library.
 *
 * Phase changes are a low, hummed chant, like a voice sounding "Om": a deep note rich in
 * overtones, two voices slightly apart, a soft note an octave below, a slow vibrato, and a
 * filter that moves like a vowel ("mm" opening to "aa" on the way in, "aa" closing through
 * "oo" to "mm" on the way out). A short room reverb softens it. The end of a session is a
 * single soft bell.
 */
export type CueKind = 'in' | 'inAgain' | 'hold' | 'out' | 'done';

/** A hummed, chant-like note. */
export interface HumCue {
  type: 'hum';
  /** The voice glides from this pitch to `endHz` over the first half of the note. */
  startHz: number;
  endHz: number;
  /** The vowel: the filter opens or closes from this frequency to `brightToHz`. */
  brightFromHz: number;
  brightToHz: number;
  durationS: number;
  attackS: number;
  /** Loudest gain, before the volume setting. */
  peak: number;
}

/** A plain sine bell. */
export interface BellCue {
  type: 'bell';
  startHz: number;
  endHz: number;
  durationS: number;
  attackS: number;
  peak: number;
}

export type Cue = HumCue | BellCue;

const A2 = 110;
const D3 = 146.83;
const E3 = 164.81;

/**
 * Notes from one calm scale, in the range people chant in. Breathing in rises a fourth (A2 to
 * D3) and the vowel opens; the top-up lifts one step (D3 to E3); breathing out sinks back
 * (D3 to A2), longest and softest, with the vowel closing to a hum. A hold is a quiet,
 * closed-mouth hum on A2.
 */
export const CUES: Record<CueKind, Cue> = {
  in: { type: 'hum', startHz: A2, endHz: D3, brightFromHz: 550, brightToHz: 1400, durationS: 1.8, attackS: 0.35, peak: 0.26 },
  inAgain: { type: 'hum', startHz: D3, endHz: E3, brightFromHz: 1000, brightToHz: 1600, durationS: 0.9, attackS: 0.12, peak: 0.22 },
  hold: { type: 'hum', startHz: A2, endHz: A2, brightFromHz: 620, brightToHz: 620, durationS: 1.4, attackS: 0.3, peak: 0.17 },
  out: { type: 'hum', startHz: D3, endHz: A2, brightFromHz: 1300, brightToHz: 480, durationS: 2.6, attackS: 0.45, peak: 0.22 },
  done: { type: 'bell', startHz: 392, endHz: 392, durationS: 1.6, attackS: 0.1, peak: 0.12 },
};

/** The cue for entering `phase`. A breath in right after another breath in is the top-up. */
export function cueFor(phase: Pick<Phase, 'kind'>, previous: Pick<Phase, 'kind'> | null): CueKind {
  if (phase.kind === 'in' && previous?.kind === 'in') return 'inAgain';
  return phase.kind;
}

/** How long a cue sounds: its own length, but never past 90% of a short phase. */
export function cueDuration(cue: Cue, phaseS?: number): number {
  if (phaseS === undefined || !Number.isFinite(phaseS) || phaseS <= 0) return cue.durationS;
  return Math.min(cue.durationS, phaseS * 0.9);
}

/**
 * Overtone strengths for the voice: every harmonic, falling off gently, with a lift around
 * the 3rd to 5th harmonic where a chanting voice carries. The overtones also keep the note
 * audible on phone speakers, which play little below 200 Hz.
 */
export function voiceHarmonics(count = 16): number[] {
  const amplitudes = [0];
  for (let n = 1; n <= count; n++) {
    const lift = n >= 3 && n <= 5 ? 1.6 : 1;
    amplitudes.push(lift / n ** 1.15);
  }
  return amplitudes;
}

export const DEFAULT_CUE_VOLUME = 0.6;
const SILENT = 0.0001;
const VOICE_DETUNE_CENTS = 7;
const VIBRATO_HZ = 4.8;
const VIBRATO_CENTS = 6;

/** Rises over the attack, holds, then fades out over the second half. Shared by both cue types. */
function envelope(param: AudioParam, start: number, duration: number, attack: number, peak: number) {
  const level = Math.max(SILENT, peak);
  const safeAttack = Math.min(attack, duration * 0.4);
  param.setValueAtTime(SILENT, start);
  param.linearRampToValueAtTime(level, start + safeAttack);
  param.setValueAtTime(level, start + Math.max(safeAttack, duration * 0.45));
  param.exponentialRampToValueAtTime(SILENT, start + duration);
}

/** Schedules a bell. Exported for tests; the player below is what the app uses. */
export function scheduleBell(ctx: BaseAudioContext, destination: AudioNode, cue: BellCue, volume: number, durationS = cue.durationS): void {
  const t = ctx.currentTime + 0.01;
  const end = t + durationS;
  const oscillator = ctx.createOscillator();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(cue.startHz, t);
  if (cue.endHz !== cue.startHz) oscillator.frequency.exponentialRampToValueAtTime(cue.endHz, end);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(SILENT, t);
  gain.gain.linearRampToValueAtTime(Math.max(SILENT, cue.peak * volume), t + cue.attackS);
  gain.gain.exponentialRampToValueAtTime(SILENT, end);

  oscillator.connect(gain).connect(destination);
  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
  };
  oscillator.start(t);
  oscillator.stop(end + 0.05);
}

/** Schedules a hummed note. Exported for tests; the player below is what the app uses. */
export function scheduleHum(
  ctx: BaseAudioContext,
  destination: AudioNode,
  cue: HumCue,
  volume: number,
  voice: PeriodicWave,
  durationS = cue.durationS,
): void {
  const t = ctx.currentTime + 0.01;
  const end = t + durationS;
  const glideEnd = t + durationS * 0.5;

  // The vowel: a gentle low-pass that opens or closes through the note.
  const vowel = ctx.createBiquadFilter();
  vowel.type = 'lowpass';
  vowel.Q.value = 2;
  vowel.frequency.setValueAtTime(cue.brightFromHz, t);
  if (cue.brightToHz !== cue.brightFromHz) vowel.frequency.exponentialRampToValueAtTime(cue.brightToHz, end);

  const amp = ctx.createGain();
  envelope(amp.gain, t, durationS, cue.attackS, cue.peak * volume);
  vowel.connect(amp).connect(destination);

  // A slow vibrato shared by every voice, so they move together like one singer.
  const vibrato = ctx.createOscillator();
  vibrato.frequency.value = VIBRATO_HZ;
  const vibratoDepth = ctx.createGain();
  vibratoDepth.gain.value = VIBRATO_CENTS;
  vibrato.connect(vibratoDepth);

  const sources: OscillatorNode[] = [vibrato];
  const mixes: GainNode[] = [vibratoDepth];
  const addVoice = (ratio: number, detune: number, level: number, wave: PeriodicWave | null) => {
    const osc = ctx.createOscillator();
    if (wave) osc.setPeriodicWave(wave);
    else osc.type = 'sine';
    osc.frequency.setValueAtTime(cue.startHz * ratio, t);
    if (cue.endHz !== cue.startHz) osc.frequency.exponentialRampToValueAtTime(cue.endHz * ratio, glideEnd);
    osc.detune.value = detune;
    vibratoDepth.connect(osc.detune);
    const mix = ctx.createGain();
    mix.gain.value = level;
    osc.connect(mix).connect(vowel);
    sources.push(osc);
    mixes.push(mix);
  };
  addVoice(1, -VOICE_DETUNE_CENTS, 0.5, voice);
  addVoice(1, VOICE_DETUNE_CENTS, 0.5, voice);
  addVoice(0.5, 0, 0.3, null); // the low octave, felt more than heard on headphones

  const last = sources[sources.length - 1]!;
  last.onended = () => {
    for (const node of [...sources, ...mixes, vowel, amp]) node.disconnect();
  };
  for (const source of sources) {
    source.start(t);
    source.stop(end + 0.05);
  }
}

/** A soft room: two seconds of decaying noise, a little different in each ear. */
export function roomImpulse(ctx: BaseAudioContext, seconds = 2.2, random: () => number = Math.random): AudioBuffer {
  const length = Math.max(1, Math.round(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      const decay = (1 - i / length) ** 3;
      data[i] = (random() * 2 - 1) * decay;
    }
  }
  return buffer;
}

/** Where every cue goes: straight out, plus a share through the room. */
function createBus(ctx: BaseAudioContext): AudioNode {
  const bus = ctx.createGain();
  const room = ctx.createConvolver();
  room.buffer = roomImpulse(ctx);
  const wet = ctx.createGain();
  wet.gain.value = 0.35;
  bus.connect(ctx.destination);
  bus.connect(room).connect(wet).connect(ctx.destination);
  return bus;
}

export function createVoiceWave(ctx: BaseAudioContext): PeriodicWave {
  const amplitudes = voiceHarmonics();
  return ctx.createPeriodicWave(new Float32Array(amplitudes.length), Float32Array.from(amplitudes));
}

/** Plays a cue on a context, through `destination`. */
export function scheduleCue(
  ctx: BaseAudioContext,
  destination: AudioNode,
  kind: CueKind,
  volume: number,
  voice: PeriodicWave,
  phaseS?: number,
): void {
  const cue = CUES[kind];
  const duration = cueDuration(cue, phaseS);
  if (cue.type === 'bell') scheduleBell(ctx, destination, cue, volume, duration);
  else scheduleHum(ctx, destination, cue, volume, voice, duration);
}

export interface CuePlayer {
  /**
   * Creates or wakes the audio context. Call it from a tap or key press, before the first cue,
   * and only while sound is on: on iPhone it pauses any music that is playing.
   */
  prepare(): Promise<void>;
  /** Plays a cue. `phaseS` is the length of the phase it starts, so a cue never outlasts it. */
  play(kind: CueKind, phaseS?: number): void;
  setMuted(muted: boolean): void;
  readonly muted: boolean;
  /** 'none' before prepare, then the context's state. For the test page. */
  readonly state: AudioContextState | 'none' | 'unsupported';
}

interface AudioSessionNavigator {
  audioSession?: { type: string };
}

function hasAudioContext(): boolean {
  return typeof window !== 'undefined' && typeof window.AudioContext === 'function';
}

export function createCuePlayer(volume = DEFAULT_CUE_VOLUME): CuePlayer {
  let ctx: AudioContext | null = null;
  let bus: AudioNode | null = null;
  let voice: PeriodicWave | null = null;
  let muted = false;

  return {
    async prepare() {
      if (!hasAudioContext()) return;
      if (!ctx) {
        // Safari 17 and up: play through the iPhone silent switch. The cues are the only guide
        // with your eyes closed there, since iPhones have no Vibration API. This pauses music
        // that is playing, so the player is only prepared while sound is on.
        // Android has no silent switch: Chrome plays at media volume whatever the ring mode.
        const session = (navigator as AudioSessionNavigator).audioSession;
        if (session) session.type = 'playback';
        ctx = new AudioContext({ latencyHint: 'interactive' });
        bus = createBus(ctx);
        voice = createVoiceWave(ctx);
      }
      if (ctx.state !== 'running') {
        try {
          await ctx.resume();
        } catch {
          // No sound this time. The session still runs.
        }
      }
    },
    play(kind, phaseS) {
      if (muted || !ctx || !bus || !voice || ctx.state !== 'running') return;
      scheduleCue(ctx, bus, kind, volume, voice, phaseS);
    },
    setMuted(value) {
      muted = value;
    },
    get muted() {
      return muted;
    },
    get state() {
      if (!hasAudioContext()) return 'unsupported';
      return ctx ? ctx.state : 'none';
    },
  };
}
