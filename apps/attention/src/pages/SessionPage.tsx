import { useCallback, useEffect, useState, type PointerEvent } from 'react';
import { EnsoCanvas } from '../components/EnsoCanvas';
import { EnsoRow } from '../components/EnsoRow';
import { UnlockOffer } from '../components/UnlockOffer';
import { useToday } from '../hooks/useToday';
import { useTrainer } from '../hooks/useTrainer';
import { saveSession, updateSettings } from '../lib/app-data';
import { clock } from '../lib/format';
import { navigate } from '../lib/navigation';
import { seedFor } from '../ink/seed';
import { FIRST_SESSION_STEPS, PROBE_NOTE, sessionMessage } from '../lib/session-copy';
import { SessionComplete } from './SessionComplete';

export function SessionPage() {
  const today = useToday();
  // Decided once, when the session opens. Today rolls over at midnight, and a free user pausing
  // past midnight on their last free day must not be thrown out of the session they started.
  const [admitted, setAdmitted] = useState(false);
  if (!admitted && today.loaded && today.canTrain) setAdmitted(true);
  if (!today.loaded) return <main className="screen session" data-phase="loading" aria-busy="true" />;
  if (!admitted && !today.canTrain) {
    return (
      <main className="screen session" data-phase="locked">
        <UnlockOffer />
      </main>
    );
  }
  return (
    <SessionRun
      startSeconds={today.level}
      targetSeconds={today.targetSeconds}
      probes={today.settings.probes}
      volume={today.settings.volume}
      firstTime={!today.settings.introSeen}
    />
  );
}

interface SessionRunProps {
  startSeconds: number;
  targetSeconds: number;
  probes: boolean;
  volume: number;
  firstTime: boolean;
}

function SessionRun({ firstTime, ...options }: SessionRunProps) {
  const trainer = useTrainer({ ...options, onSave: saveSession });
  const { state } = trainer;
  const message = sessionMessage(state);
  const index = state.stretches.length;
  const lastStretch = state.stretches.at(-1);

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      // Any tap during a stretch counts for the tick probe, except on the End button.
      if (state.phase !== 'stretch' || (event.target as HTMLElement).closest('button')) return;
      trainer.tap();
    },
    [state.phase, trainer],
  );

  // Ended before any answer: nothing to show, back to Today.
  const empty = state.phase === 'done' && state.stretches.length === 0;
  useEffect(() => {
    if (empty) navigate('', { replace: true });
  }, [empty]);

  if (state.phase === 'done') {
    if (empty) return null;
    return <SessionComplete sessionId={trainer.id} state={state} />;
  }

  // During a stretch the brush draws the current circle. Between stretches the last one stays.
  const showing =
    state.phase === 'stretch' || state.phase === 'ask'
      ? { seed: seedFor(trainer.id, index), progress: trainer.progress, drifted: false }
      : lastStretch && (state.phase === 'rest' || state.phase === 'paused')
        ? { seed: seedFor(trainer.id, index - 1), progress: 1, drifted: !lastStretch.stayed }
        : null;

  const begin = () => {
    if (firstTime) updateSettings({ introSeen: true });
    void trainer.begin();
  };

  return (
    <main className="screen session" data-phase={state.phase} onPointerDown={onPointerDown}>
      <header className="session-top">
        <button type="button" className="text-button session-end" onClick={state.phase === 'ready' ? () => navigate('') : trainer.end}>
          {state.phase === 'ready' ? 'Back' : 'End'}
        </button>
        <p className="focus-total" aria-label={`${clock(state.focusSeconds)} of ${clock(state.targetSeconds)} focus time`}>
          {clock(state.focusSeconds)} <span className="focus-total-of">of {clock(state.targetSeconds)}</span>
        </p>
      </header>

      {state.phase === 'ready' && firstTime ? (
        <section className="intro" aria-labelledby="intro-title">
          <h1 id="intro-title" className="title">
            Before you start
          </h1>
          <ol className="intro-steps">
            {FIRST_SESSION_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="intro-sounds">A low tok starts each stretch. A bell ends it.</p>
          {options.probes && <p className="intro-probe">{PROBE_NOTE}</p>}
        </section>
      ) : (
        <section className="stage" aria-label="Stretch">
          {showing ? (
            <EnsoCanvas
              key={showing.seed}
              className="stage-canvas"
              seed={showing.seed}
              progress={showing.progress}
              drifted={showing.drifted}
              animateFade
            />
          ) : (
            <div className="stage-canvas" />
          )}
          {state.phase === 'ready' && (
            <p className="stage-time">
              <span className="stage-time-value">{clock(state.nextSeconds)}</span>
              <span className="stage-time-label">first stretch</span>
            </p>
          )}
        </section>
      )}

      <EnsoRow sessionId={trainer.id} stretches={state.stretches} live className="enso-row session-row" />

      <div className="session-message" aria-live="polite">
        {!(state.phase === 'ready' && firstTime) && <p className="message-line">{message.line}</p>}
        {message.hint && <p className="message-hint">{message.hint}</p>}
      </div>

      <footer className="session-actions">
        {state.phase === 'ready' && (
          <button type="button" className="button button-primary" onClick={begin}>
            Begin
          </button>
        )}
        {state.phase === 'ask' && (
          <div className="ask">
            <button type="button" className="button button-quiet ask-no" onClick={() => trainer.answer(false)}>
              I drifted
            </button>
            <button type="button" className="button button-primary ask-yes" onClick={() => trainer.answer(true)}>
              I stayed
            </button>
          </div>
        )}
        {state.phase === 'paused' && (
          <button type="button" className="button button-primary" onClick={() => void trainer.resume()}>
            Continue
          </button>
        )}
      </footer>
    </main>
  );
}
