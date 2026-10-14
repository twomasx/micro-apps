import type { Phase } from './techniques';

/**
 * Sound cues, so the app works with your eyes closed. A soft, short sine tone at each phase
 * change, generated with Web Audio. No audio files.
 */
export type CueKind = 'in' | 'inAgain' | 'hold' | 'out' | 'done';

export interface CueTone {
  /** The tone glides from this pitch to `endHz`. */
  startHz: number;
  endHz: number;
  durationS: number;
  /** Loudest gain, before the volume setting. Kept low on purpose. */
  peak: number;
  attackS: number;
}

/**
 * In rises, out falls and is longer and softer, hold stays on one pitch. The top-up breath of
 * the cyclic sigh is a shorter, higher rise. "Done" is one long, quiet note.
 */
export const CUE_TONES: Record<CueKind, CueTone> = {
  in: { startHz: 440, endHz: 587, durationS: 0.4, peak: 0.16, attackS: 0.04 },
  inAgain: { startHz: 587, endHz: 698, durationS: 0.22, peak: 0.13, attackS: 0.03 },
  hold: { startHz: 523, endHz: 523, durationS: 0.25, peak: 0.1, attackS: 0.03 },
  out: { startHz: 494, endHz: 370, durationS: 0.7, peak: 0.12, attackS: 0.08 },
  done: { startHz: 392, endHz: 392, durationS: 1.6, peak: 0.12, attackS: 0.1 },
};

/** The cue for entering `phase`. A breath in right after another breath in is the top-up. */
export function cueFor(phase: Pick<Phase, 'kind'>, previous: Pick<Phase, 'kind'> | null): CueKind {
  if (phase.kind === 'in' && previous?.kind === 'in') return 'inAgain';
  return phase.kind;
}

export const DEFAULT_CUE_VOLUME = 0.6;
const SILENT = 0.0001;

/** Schedules one tone on a context. Exported for tests; the player below is what the app uses. */
export function scheduleTone(ctx: BaseAudioContext, destination: AudioNode, tone: CueTone, volume: number): void {
  const t = ctx.currentTime + 0.01;
  const end = t + tone.durationS;
  const oscillator = ctx.createOscillator();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(tone.startHz, t);
  if (tone.endHz !== tone.startHz) oscillator.frequency.exponentialRampToValueAtTime(tone.endHz, end);

  const gain = ctx.createGain();
  const peak = Math.max(SILENT, tone.peak * volume);
  gain.gain.setValueAtTime(SILENT, t);
  gain.gain.linearRampToValueAtTime(peak, t + tone.attackS);
  gain.gain.exponentialRampToValueAtTime(SILENT, end);

  oscillator.connect(gain).connect(destination);
  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
  };
  oscillator.start(t);
  oscillator.stop(end + 0.05);
}

export interface CuePlayer {
  /** Creates or wakes the audio context. Call it from a tap or key press, before the first cue. */
  prepare(): Promise<void>;
  play(kind: CueKind): void;
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
  let muted = false;

  return {
    async prepare() {
      if (!hasAudioContext()) return;
      if (!ctx) {
        // Safari 17 and up: mix with music that is already playing, and follow the silent switch.
        const session = (navigator as AudioSessionNavigator).audioSession;
        if (session) session.type = 'ambient';
        ctx = new AudioContext({ latencyHint: 'interactive' });
      }
      if (ctx.state !== 'running') {
        try {
          await ctx.resume();
        } catch {
          // No sound this time. The session still runs.
        }
      }
    },
    play(kind) {
      if (muted || !ctx || ctx.state !== 'running') return;
      scheduleTone(ctx, ctx.destination, CUE_TONES[kind], volume);
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
