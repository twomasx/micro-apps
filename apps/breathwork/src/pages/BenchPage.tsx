import { useEffect, useRef, useState } from 'react';
import { useBreathController } from '../hooks/useBreathController';
import { createCuePlayer, type CueKind } from '../lib/cues';
import { phaseKey } from '../lib/engine';
import { canVibrate, vibrateFor } from '../lib/haptics';
import { wholeBreathsMs } from '../lib/limits';
import { cycleMs, techniques, type Technique } from '../lib/techniques';
import { createWakeLock, type WakeLockStatus } from '../lib/wake-lock';
import './bench.css';

/**
 * Step 1 test page for the breathing engine. It is not part of the product and does not ship.
 * It ignores the free-tier limits on purpose so every technique can be tried at any length.
 */

const LENGTHS: { id: string; label: string; ms: (t: Technique) => number }[] = [
  { id: 'breath', label: '1 breath', ms: (t) => cycleMs(t) },
  ...[1, 3, 5, 10, 20].map((minutes) => ({
    id: String(minutes),
    label: `${minutes} min`,
    ms: (t: Technique) => wholeBreathsMs(minutes * 60_000, t),
  })),
];

const CUES: { kind: CueKind; label: string }[] = [
  { kind: 'in', label: 'In' },
  { kind: 'inAgain', label: 'In again' },
  { kind: 'hold', label: 'Hold' },
  { kind: 'out', label: 'Out' },
  { kind: 'done', label: 'Done' },
];

/** A phase change as the page saw it: how late the frame was that noticed it. */
interface PhaseLog {
  id: number;
  word: string;
  atS: string;
  lateMs: number;
}

const first = techniques[0]!;

export function BenchPage() {
  const [cues] = useState(() => createCuePlayer());
  const [wakeLock] = useState(() => createWakeLock());
  const [wakeStatus, setWakeStatus] = useState<WakeLockStatus>(wakeLock.status);
  const [technique, setTechnique] = useState(first);
  const [lengthId, setLengthId] = useState('1');
  const [log, setLog] = useState<PhaseLog[]>([]);
  // Audio state lives in the cue player; this only re-renders after a test cue.
  const [, setCueTries] = useState(0);
  const levelRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLProgressElement>(null);
  const length = LENGTHS.find((l) => l.id === lengthId) ?? LENGTHS[1]!;
  const { controller, snapshot } = useBreathController(technique, length.ms(technique), { cues, wakeLock });

  useEffect(() => wakeLock.subscribe(setWakeStatus), [wakeLock]);

  // Drawn straight from every frame, without React, the way a theme does it.
  useEffect(() => {
    let lastKey: number | null = null;
    return controller.onFrame((frame) => {
      levelRef.current?.style.setProperty('--level', frame.breath.lungLevel.toFixed(4));
      if (progressRef.current) progressRef.current.value = frame.breath.progress;
      const key = phaseKey(frame.breath);
      if (frame.status !== 'running' || key === lastKey) return;
      lastKey = key;
      const entry: PhaseLog = {
        id: frame.elapsedMs,
        word: frame.breath.phase.word,
        atS: ((frame.elapsedMs - frame.breath.phaseElapsedMs) / 1000).toFixed(3),
        lateMs: Math.round(frame.breath.phaseElapsedMs),
      };
      setLog((current) => [entry, ...current].slice(0, 8));
    });
  }, [controller]);

  const pick = (next: Technique, nextLength = length) => {
    setTechnique(next);
    controller.select(next, nextLength.ms(next));
    setLog([]);
  };

  const tryCue = (kind: CueKind) => {
    void cues.prepare().then(() => {
      cues.play(kind);
      setCueTries((n) => n + 1);
    });
    vibrateFor(kind);
  };

  const running = snapshot.status === 'running';
  const audioState = cues.state;

  return (
    <main className="bench">
      <h1>Breathing engine test</h1>
      <p>Test page for step 1. Not part of the app. Free-tier limits are off here.</p>

      <fieldset>
        <legend>Technique</legend>
        {techniques.map((t, i) => (
          <button key={t.id} type="button" aria-pressed={t.id === technique.id} onClick={() => pick(t)}>
            {i + 1}. {t.name}
          </button>
        ))}
      </fieldset>

      <fieldset>
        <legend>Length (rounded to whole breaths)</legend>
        {LENGTHS.map((l) => (
          <button
            key={l.id}
            type="button"
            aria-pressed={l.id === lengthId}
            onClick={() => {
              setLengthId(l.id);
              pick(technique, l);
            }}
          >
            {l.label}
          </button>
        ))}
      </fieldset>

      <section className="readout" aria-live="polite" data-status={snapshot.status}>
        <p className="status">
          {snapshot.status} · {snapshot.clock} left
        </p>
        <p className="word">
          {snapshot.status === 'ready' ? 'Ready' : snapshot.word}{' '}
          {snapshot.status !== 'ready' && <span className="count">{snapshot.secondsLeft}</span>}
        </p>
        <p className="hint">{snapshot.status === 'ready' ? 'Tap start' : snapshot.hint}</p>
        {snapshot.notice === 'away' && <p className="notice">Paused while you were away</p>}
        {snapshot.status === 'complete' && <p className="notice">Session complete</p>}
      </section>

      <div className="meters">
        <div className="lungs" ref={levelRef} role="img" aria-label="Lung level">
          <div className="fill" />
        </div>
        <label>
          Phase progress
          <progress ref={progressRef} max={1} value={0} />
        </label>
      </div>

      <div className="controls">
        <button type="button" className="primary" onClick={() => controller.toggle()}>
          {running ? 'Pause' : snapshot.status === 'paused' ? 'Resume' : 'Start'}
        </button>
        <button type="button" onClick={() => controller.reset()}>
          Reset
        </button>
        <label className="switch">
          <input
            type="checkbox"
            checked={!snapshot.muted}
            onChange={(event) => controller.setMuted(!event.target.checked)}
          />
          Sound
        </label>
      </div>

      <fieldset>
        <legend>Play one cue (sound and vibration)</legend>
        {CUES.map((c) => (
          <button key={c.kind} type="button" onClick={() => tryCue(c.kind)}>
            {c.label}
          </button>
        ))}
      </fieldset>

      <dl className="support">
        <dt>Audio</dt>
        <dd>{audioState === 'none' ? 'starts on first tap' : audioState}</dd>
        <dt>Vibration</dt>
        <dd>{canVibrate() ? 'supported' : 'not supported here (normal on iPhone)'}</dd>
        <dt>Screen awake</dt>
        <dd>
          {wakeStatus === 'unsupported'
            ? 'not supported here (needs https or localhost)'
            : wakeStatus === 'on'
              ? 'on (screen stays awake)'
              : wakeStatus}
        </dd>
      </dl>

      <section>
        <h2>Phase changes</h2>
        <p>When each phase began in session time, and how many ms late the frame was that noticed it.</p>
        <ol className="log">
          {log.map((entry) => (
            <li key={entry.id}>
              {entry.word} at {entry.atS} s, noticed {entry.lateMs} ms later
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
