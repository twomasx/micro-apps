import {
  DEFAULT_VOLUME,
  MAX_NOISE_GAIN,
  earFrequencies,
  volumeToGain,
  type Tone,
} from './frequencies';
import { fillNoise, type NoiseKind } from './noise';
import { createSilentWav } from './silent-wav';

/**
 * Where the sound goes.
 * - 'stream': into a MediaStream that an <audio> element plays. The browser sees media playback.
 * - 'direct': straight to the speakers, with a silent looping <audio> element next to it
 *   so the browser still sees media playback.
 */
export type OutputRoute = 'stream' | 'direct';
/** Test tones: play one ear only. */
export type EarSolo = 'both' | 'left' | 'right';

export const FADE_SECONDS = 2;
export const GLIDE_SECONDS = 1.5;

// setTargetAtTime approaches its target exponentially: about 99% of the way after 4.5 time constants.
// It starts from whatever the value is at that moment, so a fade can be turned around mid-way without a click.
const FADE_TIME_CONSTANT = FADE_SECONDS / 4.5;
const GLIDE_TIME_CONSTANT = GLIDE_SECONDS / 4;
const SMOOTH_TIME_CONSTANT = 0.03;
const NOISE_SWAP_TIME_CONSTANT = 0.25;
/** After a fade out the tail is below hearing by now, so the context can be suspended. */
const IDLE_AFTER_MS = (FADE_SECONDS + 0.8) * 1000;
const NOISE_SECONDS = 8;
const SILENT_SECONDS = 10;

export interface ToneGraph {
  left: OscillatorNode;
  right: OscillatorNode;
  leftGain: GainNode;
  rightGain: GainNode;
  merger: ChannelMergerNode;
  /** User volume for the tones. */
  volume: GainNode;
  /** Start, stop and end-of-session envelope. Tones and noise both pass through it. */
  fade: GainNode;
}

/**
 * Two sine oscillators, one per ear. Each goes to its own input of a channel
 * merger, so the left tone is only in channel 0 and the right tone only in
 * channel 1. Nothing is panned or mixed, so nothing leaks between ears.
 * The graph starts silent: `fade` is at 0.
 */
export function buildToneGraph(ctx: BaseAudioContext, tone: Tone): ToneGraph {
  const frequencies = earFrequencies(tone);
  const merger = ctx.createChannelMerger(2);

  const ear = (frequency: number, channel: number) => {
    const oscillator = ctx.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(merger, 0, channel);
    return { oscillator, gain };
  };
  const left = ear(frequencies.left, 0);
  const right = ear(frequencies.right, 1);

  const volume = ctx.createGain();
  const fade = ctx.createGain();
  fade.gain.value = 0;
  merger.connect(volume);
  volume.connect(fade);

  return {
    left: left.oscillator,
    right: right.oscillator,
    leftGain: left.gain,
    rightGain: right.gain,
    merger,
    volume,
    fade,
  };
}

export interface AudioEngineOptions {
  route?: OutputRoute;
  /** Called when something outside the app stops playback, like a phone call. The engine has already paused. */
  onInterrupted?: () => void;
}

export interface PlayOptions {
  /** Time left in the session. The fade out at the end is scheduled on the audio clock. */
  remainingMs?: number;
}

export interface AudioEngine {
  readonly route: OutputRoute;
  /** Starts or resumes with a fade in. Call it from a tap or key press. */
  play(options?: PlayOptions): Promise<void>;
  /** Fades out, then lets the audio hardware rest. */
  pause(): void;
  /** Glides both ears to the new frequencies. */
  setTone(tone: Tone): void;
  /** 0 to 1. */
  setVolume(volume: number): void;
  setNoise(kind: NoiseKind | null): void;
  /** 0 to 1. */
  setNoiseVolume(volume: number): void;
  setEarSolo(solo: EarSolo): void;
  isPlaying(): boolean;
  dispose(): void;
}

export function createAudioEngine(options: AudioEngineOptions = {}): AudioEngine {
  const route = options.route ?? 'stream';

  let ctx: AudioContext | null = null;
  let graph: ToneGraph | null = null;
  let element: HTMLAudioElement | null = null;
  let silentUrl: string | null = null;
  const noiseGains: Partial<Record<NoiseKind, GainNode>> = {};

  let playing = false;
  let disposed = false;
  /** When the session ends, on the audio clock. */
  let endAt: number | null = null;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;

  let tone: Tone = { carrier: 300, beat: 6 };
  let volume = DEFAULT_VOLUME;
  let noiseKind: NoiseKind | null = null;
  let noiseVolume = DEFAULT_VOLUME;
  let solo: EarSolo = 'both';

  const interrupted = () => {
    if (!playing) return;
    pause();
    options.onInterrupted?.();
  };

  function setUp(): { ctx: AudioContext; graph: ToneGraph; element: HTMLAudioElement } {
    if (ctx && graph && element) return { ctx, graph, element };

    const context = new AudioContext({ latencyHint: 'playback' });
    const built = buildToneGraph(context, tone);
    built.volume.gain.value = volumeToGain(volume);
    built.leftGain.gain.value = solo === 'right' ? 0 : 1;
    built.rightGain.gain.value = solo === 'left' ? 0 : 1;
    built.left.start();
    built.right.start();

    const audio = new Audio();
    if (route === 'stream') {
      const destination = context.createMediaStreamDestination();
      built.fade.connect(destination);
      audio.srcObject = destination.stream;
    } else {
      built.fade.connect(context.destination);
      silentUrl = URL.createObjectURL(new Blob([createSilentWav(SILENT_SECONDS)], { type: 'audio/wav' }));
      audio.src = silentUrl;
      audio.loop = true;
    }
    // The browser pauses the element when another app takes the audio, for example a call.
    audio.addEventListener('pause', interrupted);
    // iPhone Safari reports 'interrupted' here, which is not in the TypeScript types.
    context.addEventListener('statechange', () => {
      if ((context.state as string) === 'interrupted') interrupted();
    });

    ctx = context;
    graph = built;
    element = audio;
    applyNoise();
    return { ctx: context, graph: built, element: audio };
  }

  /** Rewrites the fade envelope from this moment on. */
  function applyEnvelope() {
    if (!ctx || !graph) return;
    const now = ctx.currentTime;
    const gain = graph.fade.gain;
    gain.cancelScheduledValues(now);
    if (!playing) {
      gain.setTargetAtTime(0, now, FADE_TIME_CONSTANT);
      return;
    }
    gain.setTargetAtTime(1, now, FADE_TIME_CONSTANT);
    if (endAt !== null) {
      gain.setTargetAtTime(0, Math.max(now, endAt - FADE_SECONDS), FADE_TIME_CONSTANT);
    }
  }

  function noiseGain(kind: NoiseKind): GainNode | null {
    if (!ctx || !graph) return null;
    const existing = noiseGains[kind];
    if (existing) return existing;

    const frames = Math.round(ctx.sampleRate * NOISE_SECONDS);
    const buffer = ctx.createBuffer(2, frames, ctx.sampleRate);
    // Each ear gets its own noise, so the layer sounds wide and not like a point in the middle.
    for (let channel = 0; channel < 2; channel++) {
      const data = new Float32Array(frames);
      fillNoise(data, kind);
      buffer.copyToChannel(data, channel);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(gain);
    gain.connect(graph.fade);
    source.start();
    noiseGains[kind] = gain;
    return gain;
  }

  function applyNoise() {
    if (!ctx) return;
    if (noiseKind) noiseGain(noiseKind);
    const now = ctx.currentTime;
    for (const kind of ['pink', 'brown'] as const) {
      const gain = noiseGains[kind];
      if (!gain) continue;
      const target = kind === noiseKind ? volumeToGain(noiseVolume, MAX_NOISE_GAIN) : 0;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(target, now, NOISE_SWAP_TIME_CONSTANT);
    }
  }

  function smooth(param: AudioParam, value: number, timeConstant: number) {
    if (!ctx) return;
    param.cancelScheduledValues(ctx.currentTime);
    param.setTargetAtTime(value, ctx.currentTime, timeConstant);
  }

  async function play(playOptions: PlayOptions = {}): Promise<void> {
    if (disposed) return;
    const nodes = setUp();
    clearTimeout(idleTimer);
    playing = true;
    endAt =
      playOptions.remainingMs === undefined
        ? null
        : nodes.ctx.currentTime + Math.max(0, playOptions.remainingMs) / 1000;
    applyEnvelope();

    // Both calls must start inside the tap that asked for sound, so neither is awaited first.
    const resumed = nodes.ctx.resume();
    const started = nodes.element.play();
    await resumed;
    try {
      await started;
    } catch (error) {
      // AbortError: a pause came in before the element started. That is not a failure.
      // On the direct route the element is silent, so the tones play without it.
      const aborted = error instanceof DOMException && error.name === 'AbortError';
      if (!aborted && route === 'stream') {
        playing = false;
        applyEnvelope();
        throw error;
      }
    }
  }

  function pause() {
    if (!playing) return;
    playing = false;
    endAt = null;
    applyEnvelope();
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (playing || disposed) return;
      element?.pause();
      void ctx?.suspend();
    }, IDLE_AFTER_MS);
  }

  return {
    route,
    play,
    pause,
    setTone(next) {
      tone = next;
      if (!graph) return;
      const frequencies = earFrequencies(next);
      smooth(graph.left.frequency, frequencies.left, GLIDE_TIME_CONSTANT);
      smooth(graph.right.frequency, frequencies.right, GLIDE_TIME_CONSTANT);
    },
    setVolume(next) {
      volume = next;
      if (graph) smooth(graph.volume.gain, volumeToGain(next), SMOOTH_TIME_CONSTANT);
    },
    setNoise(kind) {
      noiseKind = kind;
      applyNoise();
    },
    setNoiseVolume(next) {
      noiseVolume = next;
      applyNoise();
    },
    setEarSolo(next) {
      solo = next;
      if (!graph) return;
      smooth(graph.leftGain.gain, next === 'right' ? 0 : 1, SMOOTH_TIME_CONSTANT);
      smooth(graph.rightGain.gain, next === 'left' ? 0 : 1, SMOOTH_TIME_CONSTANT);
    },
    isPlaying: () => playing,
    dispose() {
      disposed = true;
      playing = false;
      clearTimeout(idleTimer);
      if (element) {
        element.removeEventListener('pause', interrupted);
        element.pause();
        element.srcObject = null;
        element.removeAttribute('src');
      }
      if (silentUrl) URL.revokeObjectURL(silentUrl);
      void ctx?.close();
      ctx = null;
      graph = null;
      element = null;
    },
  };
}
