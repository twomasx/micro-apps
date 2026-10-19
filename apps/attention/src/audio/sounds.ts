/**
 * The three sounds, made with Web Audio. No audio files.
 * Tok: a stretch begins. Bell: a stretch ends. Tick: the experimental probe.
 * See DESIGN-NOTES.md, Sounds, for why each one sounds the way it does.
 */
export type SoundName = 'tok' | 'bell' | 'tick';

/** [frequency in Hz, relative level, decay to silence in seconds] */
type Partial = readonly [number, number, number];

export const TOK = {
  /** Low and wooden. 196 Hz is G3. */
  partials: [
    [196, 1, 0.35],
    // Phone speakers barely play 196 Hz. These carry the tok there; headphones get the low body too.
    [392, 0.45, 0.2],
    [588, 0.18, 0.12],
  ] as readonly Partial[],
  /** Each partial starts this much sharp and settles, like a struck block. */
  glide: 1.03,
  glideSeconds: 0.06,
  level: 0.55,
  /** A very short knock of filtered noise for the wooden strike. */
  knock: { hz: 1100, q: 1.4, seconds: 0.03, level: 0.35 },
} as const;

export const BELL = {
  baseHz: 880,
  /** Struck-bell ratios. Higher partials die faster. */
  partials: [
    [1, 1, 2.2],
    [2.76, 0.32, 1.2],
    [5.4, 0.1, 0.5],
  ] as readonly Partial[],
  level: 0.22,
} as const;

export const TICK = {
  /** Band-passed noise: nothing tonal, so it can't be mistaken for the tok or the bell. */
  hz: 3500,
  q: 5,
  seconds: 0.012,
  /** About a sixth of the tok. It follows the volume setting like the others. */
  level: 0.09,
} as const;

/** How long each sound rings, in seconds. */
export function soundSeconds(name: SoundName): number {
  if (name === 'tok') return Math.max(...TOK.partials.map((p) => p[2]));
  if (name === 'bell') return Math.max(...BELL.partials.map((p) => p[2]));
  return TICK.seconds;
}

/** Peak gain for a sound at a volume setting from 0 to 1. Squared, so the slider feels even to the ear. */
export function peakGain(name: SoundName, volume: number): number {
  const v = Math.min(1, Math.max(0, volume));
  const level = name === 'tok' ? TOK.level : name === 'bell' ? BELL.level : TICK.level;
  return level * v * v;
}

const ATTACK = 0.004;
const SILENT = 0.0001;

function tone(ctx: AudioContext, out: AudioNode, at: number, [hz, rel, decay]: Partial, peak: number, glide = 1) {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(hz * glide, at);
  if (glide !== 1) osc.frequency.exponentialRampToValueAtTime(hz, at + TOK.glideSeconds);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(SILENT, at);
  gain.gain.exponentialRampToValueAtTime(Math.max(SILENT, peak * rel), at + ATTACK);
  gain.gain.exponentialRampToValueAtTime(SILENT, at + decay);
  osc.connect(gain).connect(out);
  osc.start(at);
  osc.stop(at + decay + 0.05);
}

function noiseBurst(ctx: AudioContext, out: AudioNode, at: number, hz: number, q: number, seconds: number, peak: number) {
  const frames = Math.max(1, Math.ceil(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = hz;
  filter.Q.value = q;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(SILENT, at);
  gain.gain.exponentialRampToValueAtTime(Math.max(SILENT, peak), at + 0.001);
  gain.gain.exponentialRampToValueAtTime(SILENT, at + seconds);
  source.connect(filter).connect(gain).connect(out);
  source.start(at);
  source.stop(at + seconds + 0.01);
}

function schedule(ctx: AudioContext, out: AudioNode, name: SoundName, volume: number) {
  const at = ctx.currentTime + 0.01;
  const peak = peakGain(name, volume);
  if (peak <= 0) return;
  if (name === 'tok') {
    for (const partial of TOK.partials) tone(ctx, out, at, partial, peak, TOK.glide);
    const { hz, q, seconds, level } = TOK.knock;
    noiseBurst(ctx, out, at, hz, q, seconds, peak * level);
  } else if (name === 'bell') {
    for (const [ratio, rel, decay] of BELL.partials) tone(ctx, out, at, [BELL.baseHz * ratio, rel, decay], peak);
  } else {
    noiseBurst(ctx, out, at, TICK.hz, TICK.q, TICK.seconds, peak);
  }
}

interface AudioSessionNavigator {
  audioSession?: { type: string };
}

export interface SoundPlayer {
  /**
   * Creates or resumes the audio context. Call it inside a tap (Begin, Start test):
   * phones only allow sound to start from a user gesture.
   */
  prepare(): Promise<void>;
  play(name: SoundName): void;
  setVolume(volume: number): void;
  /** Lets the audio context go when the screen that made it goes away. A later prepare() makes a new one. */
  close(): void;
  readonly state: AudioContextState | 'none' | 'unsupported';
}

function hasAudioContext(): boolean {
  return typeof window !== 'undefined' && typeof window.AudioContext === 'function';
}

export function createSoundPlayer(volume: number): SoundPlayer {
  let ctx: AudioContext | null = null;
  let out: AudioNode | null = null;
  let current = volume;

  return {
    async prepare() {
      if (!hasAudioContext()) return;
      if (!ctx) {
        // Safari 17 and up: play through the iPhone silent switch. With eyes closed the sounds
        // are the only signal on an iPhone, which has no vibration. As in breathwork.
        const session = (navigator as AudioSessionNavigator).audioSession;
        if (session) session.type = 'playback';
        ctx = new AudioContext({ latencyHint: 'interactive' });
        // A gentle limiter keeps small phone speakers from crackling on the tok's attack.
        const limiter = ctx.createDynamicsCompressor();
        limiter.threshold.value = -6;
        limiter.ratio.value = 4;
        limiter.connect(ctx.destination);
        out = limiter;
      }
      if (ctx.state !== 'running') {
        try {
          await ctx.resume();
        } catch {
          // No sound this time. The session still runs.
        }
      }
    },
    play(name) {
      if (!ctx || !out || ctx.state !== 'running') return;
      schedule(ctx, out, name, current);
    },
    setVolume(value) {
      current = value;
    },
    close() {
      // Phones allow only a few audio contexts at a time, and an open one keeps the audio hardware awake.
      const closing = ctx;
      ctx = null;
      out = null;
      if (closing && closing.state !== 'closed') closing.close().catch(() => undefined);
    },
    get state() {
      if (!hasAudioContext()) return 'unsupported';
      return ctx ? ctx.state : 'none';
    },
  };
}
