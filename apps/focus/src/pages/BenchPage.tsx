import { useEffect, useRef, useState } from 'react';
import { createAudioEngine, type AudioEngine, type EarSolo, type OutputRoute } from '../lib/audio';
import { DEFAULT_VOLUME, earFrequencies } from '../lib/frequencies';
import { bindMediaSession, setMediaSessionState } from '../lib/media-session';
import type { NoiseKind } from '../lib/noise';
import { presets } from '../lib/presets';
import {
  createTimer,
  elapsedMs,
  formatClock,
  isComplete,
  pauseTimer,
  remainingMs,
  startTimer,
} from '../lib/timer';
import './bench.css';

/**
 * Step 1 test page for the audio engine. It is not part of the product and does not ship.
 * It ignores the free-tier limits on purpose so every preset and the noise layer can be heard.
 */

const ROUTES: { id: OutputRoute; label: string }[] = [
  { id: 'stream', label: 'A: stream into an audio element' },
  { id: 'direct', label: 'B: direct, with a silent audio element' },
];
const EARS: { id: EarSolo; label: string }[] = [
  { id: 'both', label: 'Both ears' },
  { id: 'left', label: 'Left only' },
  { id: 'right', label: 'Right only' },
];
const NOISES: { id: NoiseKind | null; label: string }[] = [
  { id: null, label: 'No noise' },
  { id: 'pink', label: 'Pink' },
  { id: 'brown', label: 'Brown' },
];
const LENGTHS = [1, 10, 30];
const MINUTE_MS = 60_000;

export function BenchPage() {
  const [route, setRoute] = useState<OutputRoute>('stream');
  const [presetId, setPresetId] = useState('calm');
  const [minutes, setMinutes] = useState(10);
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  const [solo, setSolo] = useState<EarSolo>('both');
  const [noise, setNoise] = useState<NoiseKind | null>(null);
  const [noiseVolume, setNoiseVolume] = useState(DEFAULT_VOLUME);
  const [playing, setPlaying] = useState(false);
  const [timer, setTimer] = useState(() => createTimer(10 * MINUTE_MS));
  const [now, setNow] = useState(() => Date.now());
  const [note, setNote] = useState('');
  const engineRef = useRef<AudioEngine | null>(null);

  const preset = presets.find((p) => p.id === presetId) ?? presets[0]!;
  const ears = earFrequencies(preset);

  const stop = (message = '') => {
    const t = Date.now();
    engineRef.current?.pause();
    setTimer((current) => pauseTimer(current, t));
    setNow(t);
    setPlaying(false);
    setNote(message);
  };

  const start = () => {
    const engine = engineRef.current;
    if (!engine) return;
    const t = Date.now();
    const next = startTimer(isComplete(timer, t) ? createTimer(minutes * MINUTE_MS) : timer, t);
    engine.setTone(preset);
    engine.setVolume(volume);
    engine.setEarSolo(solo);
    engine.setNoise(noise);
    engine.setNoiseVolume(noiseVolume);
    engine.play({ remainingMs: remainingMs(next, t) }).catch((error: unknown) => {
      stop(`Could not start audio: ${error instanceof Error ? error.message : String(error)}`);
    });
    setTimer(next);
    setNow(t);
    setPlaying(true);
    setNote('');
  };

  // A new engine per route. Nothing makes sound until Play is tapped.
  useEffect(() => {
    const engine = createAudioEngine({
      route,
      onInterrupted: () => {
        const t = Date.now();
        setTimer((current) => pauseTimer(current, t));
        setNow(t);
        setPlaying(false);
        setNote('Paused by the phone or another app.');
      },
    });
    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [route]);

  // The clock reads real time. This only decides how often the screen is redrawn.
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (isComplete(timer, t)) {
        engineRef.current?.pause();
        setTimer(pauseTimer(timer, t));
        setPlaying(false);
        setNote('Session complete.');
      }
    }, 250);
    return () => clearInterval(id);
  }, [playing, timer]);

  useEffect(() => bindMediaSession({ onPlay: start, onPause: () => stop() }));

  useEffect(() => {
    setMediaSessionState({
      title: preset.name,
      playing,
      durationSeconds: timer.durationMs / 1000,
      positionSeconds: elapsedMs(timer, now) / 1000,
    });
  }, [preset.name, playing, timer, now]);

  return (
    <main className="bench">
      <h1>Focus audio test page</h1>
      <p>Put headphones on. This page is for testing only and is not part of the app.</p>

      <section>
        <h2>Audio route</h2>
        <div className="bench-row" role="group" aria-label="Audio route">
          {ROUTES.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={route === r.id}
              disabled={playing}
              onClick={() => setRoute(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>
        <p>Pause before you switch routes.</p>
      </section>

      <section>
        <h2>Preset</h2>
        <div className="bench-row" role="group" aria-label="Preset">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={p.id === presetId}
              onClick={() => {
                setPresetId(p.id);
                engineRef.current?.setTone(p);
              }}
            >
              {p.short} {p.beat} Hz
            </button>
          ))}
        </div>
        <p>
          Left ear {ears.left} Hz. Right ear {ears.right} Hz. Beat {preset.beat} Hz.
        </p>
      </section>

      <section>
        <h2>Session</h2>
        <div className="bench-row" role="group" aria-label="Session length">
          {LENGTHS.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={minutes === m}
              disabled={playing}
              onClick={() => {
                setMinutes(m);
                setTimer(createTimer(m * MINUTE_MS));
              }}
            >
              {m} min
            </button>
          ))}
        </div>
        <p className="bench-clock" data-state={playing ? 'playing' : 'paused'}>
          {formatClock(remainingMs(timer, now))} left
        </p>
        <button type="button" className="bench-play" onClick={playing ? () => stop() : start}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <p role="status">{note}</p>
      </section>

      <section>
        <h2>Volume</h2>
        <label>
          Tones {Math.round(volume * 100)}%
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(event) => {
              const value = Number(event.target.value);
              setVolume(value);
              engineRef.current?.setVolume(value);
            }}
          />
        </label>
      </section>

      <section>
        <h2>Ear test tones</h2>
        <div className="bench-row" role="group" aria-label="Ears">
          {EARS.map((e) => (
            <button
              key={e.id}
              type="button"
              aria-pressed={solo === e.id}
              onClick={() => {
                setSolo(e.id);
                engineRef.current?.setEarSolo(e.id);
              }}
            >
              {e.label}
            </button>
          ))}
        </div>
        <p>
          With "Left only" the right ear must be silent, and the other way round. If you hear the tone in both
          ears, this route mixes to mono and the beat is lost.
        </p>
      </section>

      <section>
        <h2>Noise layer</h2>
        <div className="bench-row" role="group" aria-label="Noise">
          {NOISES.map((n) => (
            <button
              key={n.label}
              type="button"
              aria-pressed={noise === n.id}
              onClick={() => {
                setNoise(n.id);
                engineRef.current?.setNoise(n.id);
              }}
            >
              {n.label}
            </button>
          ))}
        </div>
        <label>
          Noise {Math.round(noiseVolume * 100)}%
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={noiseVolume}
            onChange={(event) => {
              const value = Number(event.target.value);
              setNoiseVolume(value);
              engineRef.current?.setNoiseVolume(value);
            }}
          />
        </label>
      </section>

      <section>
        <h2>What to check, on each route</h2>
        <ol>
          <li>Left only and Right only: each tone stays in its own ear.</li>
          <li>Both ears: you hear a slow pulse. It is fastest on Deep.</li>
          <li>Play, Pause, a preset change and the volume slider make no click.</li>
          <li>Turn the screen off for 2 minutes. The sound keeps playing.</li>
          <li>The lock screen shows play and pause, and both work.</li>
          <li>Pick 1 min and turn the screen off. The sound fades out at the end by itself.</li>
          <li>Turn the screen on again. The time left is correct.</li>
        </ol>
      </section>
    </main>
  );
}
