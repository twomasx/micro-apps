import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { vibrate } from '@micro/platform';
import { ColorFan } from '../components/ColorFan.tsx';
import { ColorPicker } from '../components/ColorPicker.tsx';
import { ProgressRing } from '../components/ProgressRing.tsx';
import { TugField } from '../components/TugField.tsx';
import { useReducedMotion } from '../hooks/useReducedMotion.ts';
import { useWakeLock } from '../hooks/useWakeLock.ts';
import { hexToRgb } from '../lib/color.ts';
import {
  DEFAULT_CHOICE,
  loadColorChoice,
  pairFor,
  saveColorChoice,
  type ColorChoice,
} from '../lib/color-settings.ts';
import { getDeviceId } from '../lib/device.ts';
import { shadingFor } from '../lib/readability.ts';
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
  const [choice, setChoice] = useState<ColorChoice>(DEFAULT_CHOICE);
  useEffect(() => {
    let live = true;
    void loadColorChoice().then((saved) => live && setChoice(saved));
    return () => {
      live = false;
    };
  }, []);
  const [fanOpen, setFanOpen] = useState(false);
  // While the picker is open, the field previews its colors. Closing it without "Use these" puts the old pair back.
  const [picking, setPicking] = useState<{ left: string; right: string } | null>(null);
  const shown: ColorChoice = picking ? { kind: 'custom', ...picking } : choice;
  const pair = pairFor(shown);
  // A few dozen arithmetic steps: cheap enough for every render.
  const shading = shadingFor(hexToRgb(pair.left.hex), hexToRgb(pair.right.hex));

  const choose = useCallback((next: ColorChoice) => {
    setChoice(next);
    void saveColorChoice(next);
  }, []);

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
  const style = {
    '--left': pair.left.hex,
    '--right': pair.right.hex,
    '--shade-top': shading.top.toFixed(3),
    '--shade-bottom': shading.bottom.toFixed(3),
  } as CSSProperties;

  return (
    <main className="tug" data-phase={phase} data-fan={fanOpen ? 'open' : 'closed'} style={style}>
      <TugField session={session} pair={pair} reducedMotion={reducedMotion} />
      <div className="tug-ui">
        {fanOpen && (
          <button type="button" className="fan-backdrop" aria-label="Close colors" onClick={() => setFanOpen(false)} />
        )}
        <header className="tug-top" inert={fanOpen}>
          <h1 className="tug-headline" data-visible={text.headlineVisible}>
            {text.headline}
          </h1>
          {start && <ProgressRing progress={progress} complete={phase === 'done'} />}
        </header>

        <div className="tug-bottom">
          <div className="tug-text" inert={fanOpen}>
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
          </div>

          <div className="tug-actions">
            <button
              type="button"
              className="tug-go"
              data-variant={active ? 'quiet' : 'primary'}
              inert={fanOpen}
              onClick={() => (active ? session.stop() : void session.begin())}
            >
              {text.button}
            </button>
            <ColorFan
              open={fanOpen}
              pair={pair}
              hidden={active}
              onOpenChange={setFanOpen}
              onPickPreset={(id) => {
                choose({ kind: 'preset', id });
                // A moment to see the new pair selected, then the fan folds.
                setTimeout(() => setFanOpen(false), reducedMotion ? 0 : 220);
              }}
              onPickCustom={() => {
                setFanOpen(false);
                const base = pairFor(choice);
                setPicking({ left: base.left.hex, right: base.right.hex });
              }}
            />
          </div>
        </div>
      </div>
      <ColorPicker
        open={picking !== null}
        left={picking?.left ?? pair.left.hex}
        right={picking?.right ?? pair.right.hex}
        onChange={(left, right) => setPicking({ left, right })}
        onApply={() => {
          if (picking) choose({ kind: 'custom', ...picking });
          setPicking(null);
        }}
        onClose={() => setPicking(null)}
      />
    </main>
  );
}
