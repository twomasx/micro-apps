import { useEffect, useMemo, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { vibrate } from '@micro/platform';
import { ProgressRing } from '../components/ProgressRing.tsx';
import { TugField } from '../components/TugField.tsx';
import { useReducedMotion } from '../hooks/useReducedMotion.ts';
import { useWakeLock } from '../hooks/useWakeLock.ts';
import { getDeviceId } from '../lib/device.ts';
import { pairName, PRESET_PAIRS } from '../lib/pairs.ts';
import { RunSession } from '../lib/run-session.ts';
import { SCORE_CAPTION, tugText } from '../lib/tug-copy.ts';

/** How long the headline names your color after a run starts, before it fades out (ms). */
const HEADLINE_HOLD_MS = 1600;

export function TugPage() {
  const session = useMemo(() => new RunSession({ kind: 'tug', getDeviceId }), []);
  useEffect(() => () => session.dispose(), [session]);
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const reducedMotion = useReducedMotion();
  const { lock } = useWakeLock();
  // Step 2 stand-in for the color fan (step 3): the dot steps through the preset pairs.
  const [pairIndex, setPairIndex] = useState(0);
  const pair = PRESET_PAIRS[pairIndex]!;

  const { phase, start, n } = snapshot;
  const active = phase === 'starting' || phase === 'running';

  // The headline names your color for a moment after a run starts, then fades out.
  const [headlineDoneFor, setHeadlineDoneFor] = useState<string | null>(null);
  const runId = start?.runId ?? null;
  useEffect(() => {
    if (!runId) return;
    const timer = setTimeout(() => setHeadlineDoneFor(runId), HEADLINE_HOLD_MS);
    return () => clearTimeout(timer);
  }, [runId]);

  useEffect(() => {
    if (active) void lock.acquire();
    else void lock.release();
  }, [active, lock]);

  useEffect(() => {
    if (phase === 'done') vibrate(15);
  }, [phase]);

  const text = tugText(snapshot, pair, runId !== null && headlineDoneFor !== runId);
  const progress = start ? n / start.lengthBits : 0;
  const colors = { '--left': pair.left.hex, '--right': pair.right.hex } as CSSProperties;

  return (
    <main className="tug" data-phase={phase} style={colors}>
      <TugField session={session} pair={pair} reducedMotion={reducedMotion} />
      <div className="tug-shade" aria-hidden="true" />
      <div className="tug-ui">
        <header className="tug-top">
          <h1 className="tug-headline" data-visible={text.headlineVisible}>
            {text.headline}
          </h1>
          {start && <ProgressRing progress={progress} complete={phase === 'done'} />}
        </header>

        <div className="tug-bottom">
          {text.pill && (
            <p className="tug-pill">
              <span className="tug-pill-dot" style={{ background: text.pill.hex }} aria-hidden="true" />
              <span>
                Your color: <b>{text.pill.name}</b>
              </span>
              <span className="tug-pill-arrow" aria-hidden="true">
                {text.pill.arrow}
              </span>
              <span className="visually-hidden">, which travels {text.pill.arrow === '←' ? 'left' : 'right'}</span>
            </p>
          )}
          {text.score !== null && (
            <p className="tug-score">
              <span className="tug-score-value">{text.score}</span>
              <span className="tug-score-caption">{SCORE_CAPTION}</span>
            </p>
          )}
          <p className="tug-line" aria-live="polite">
            {text.line}
          </p>
          <div className="tug-actions">
            <button
              type="button"
              className="tug-go"
              data-variant={active ? 'quiet' : 'primary'}
              onClick={() => (active ? session.stop() : void session.begin())}
            >
              {text.button}
            </button>
            {!active && (
              <button
                type="button"
                className="tug-colors"
                aria-label={`Colors: ${pairName(pair)}. Tap for the next pair.`}
                onClick={() => setPairIndex((i) => (i + 1) % PRESET_PAIRS.length)}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
