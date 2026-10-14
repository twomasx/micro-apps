import { useState } from 'react';
import { AgainIcon, LockIcon, MenuIcon, PauseIcon, PlayIcon, SoundOffIcon, SoundOnIcon } from '../components/Icons';
import { Link } from '../components/Link';
import { Sheet } from '../components/Sheet';
import { TechniquePicker } from '../components/TechniquePicker';
import { useBreathScreen } from '../hooks/useBreathScreen';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useShortcuts } from '../hooks/useShortcuts';
import { minuteOptions, UNLOCKED_MINUTES, wholeBreathsMs } from '../lib/limits';
import { navigate } from '../lib/navigation';
import { breathCount, lengthLabel, noteText, nowText, startLabel } from '../lib/screen-view';
import { techniques } from '../lib/techniques';
import { defaultTheme } from '../themes';
import '../styles/breathe.css';

const SAFETY =
  "Breathe gently. If you feel dizzy or lightheaded, stop and breathe normally. Don't practice breath holds while driving, in water, or anywhere fainting would be dangerous. If you are pregnant or have a heart or lung condition, check with a doctor first.";

type SheetName = 'length' | 'menu' | null;

export function BreathePage() {
  const screen = useBreathScreen();
  const reducedMotion = useReducedMotion();
  const [sheet, setSheet] = useState<SheetName>(null);
  const { snapshot, technique, plan, moment } = screen;
  const now = nowText(snapshot, { technique, durationMs: plan.durationMs, preview: plan.preview });
  const label = startLabel(snapshot.status);
  const Stage = defaultTheme.Stage;

  useShortcuts({
    enabled: sheet === null,
    onToggle: () => (moment === 'intro' ? screen.startFromIntro() : screen.toggle()),
    onTechnique: (index) => {
      const next = techniques[index];
      if (next) screen.selectTechnique(next);
    },
  });

  return (
    <main
      className="breathe"
      data-theme={defaultTheme.id}
      data-status={snapshot.status}
      data-moment={moment}
      data-kind={now.kind}
    >
      <header className="breathe-top">
        <div className="breathe-title">
          <h1 className="breathe-name">{technique.name}</h1>
          <p className="breathe-note">{noteText(technique, plan.preview)}</p>
        </div>
        <div className="breathe-corner">
          <span className="breathe-clock">
            <span className="visually-hidden">Time left </span>
            {snapshot.clock}
          </span>
          <button type="button" className="icon-button" aria-label="Menu" onClick={() => setSheet('menu')}>
            <MenuIcon />
          </button>
        </div>
      </header>

      <div className="breathe-stage">
        <Stage controller={screen.controller} moment={moment} reducedMotion={reducedMotion} />
      </div>

      {moment === 'intro' ? (
        <section className="intro" aria-labelledby="intro-title">
          <h2 id="intro-title" className="intro-title">
            Follow the shape
          </h2>
          <p className="intro-text">
            The dot goes up while you breathe in, across while you hold, and down while you breathe out. Each side
            shows its seconds.
          </p>
          <p className="intro-safety">{SAFETY}</p>
          <button type="button" className="go-wide" onClick={screen.startFromIntro}>
            Start
          </button>
        </section>
      ) : (
        <>
          <section className="now">
            <div className="now-text" aria-live="polite">
              <p className="now-word" key={`${now.word}-${snapshot.phaseIndex}-${snapshot.status}`} data-kind={now.kind}>
                {now.word}
              </p>
              <p className="now-hint">
                {now.hint}
                {snapshot.status === 'complete' && plan.preview && (
                  <>
                    {' '}
                    <Link to="unlock" className="now-link">
                      See the unlock
                    </Link>
                  </>
                )}
              </p>
            </div>
            {now.count !== null && (
              <span className="now-count" aria-hidden="true">
                {now.count}
              </span>
            )}
          </section>

          {snapshot.notice === 'away' && <p className="notice">Paused while you were away</p>}

          <div className="controls">
            <button type="button" className="side-button" onClick={() => setSheet('length')}>
              <span className="side-label">Length</span>
              <span className="side-value">{lengthLabel(screen.minutes, plan.preview)}</span>
            </button>
            <button type="button" className="go" aria-label={label} data-action={label.toLowerCase()} onClick={screen.toggle}>
              {label === 'Pause' ? <PauseIcon /> : label === 'Again' ? <AgainIcon /> : <PlayIcon />}
            </button>
            <button
              type="button"
              className="side-button"
              aria-pressed={!snapshot.muted}
              aria-label="Sound"
              onClick={screen.toggleSound}
            >
              <span className="side-label" aria-hidden="true">
                Sound
              </span>
              <span className="side-value">{snapshot.muted ? <SoundOffIcon /> : <SoundOnIcon />}</span>
            </button>
          </div>
        </>
      )}

      <TechniquePicker
        techniques={techniques}
        selectedId={technique.id}
        unlocked={screen.unlocked}
        onSelect={screen.selectTechnique}
      />

      <Sheet open={sheet === 'length'} onClose={() => setSheet(null)} title="Length" name="length">
        {plan.preview && (
          <p className="sheet-text">{technique.name} runs as a 1 minute preview. The lifetime unlock adds the full sessions.</p>
        )}
        <div className="length-options" role="group" aria-label="Session length">
          {UNLOCKED_MINUTES.map((minutes) => {
            const locked = !minuteOptions(screen.unlocked).includes(minutes);
            const breaths = breathCount(wholeBreathsMs(minutes * 60_000, technique), technique);
            return (
              <button
                key={minutes}
                type="button"
                className="length-option"
                aria-pressed={!locked && !plan.preview && minutes === screen.minutes}
                data-locked={locked || undefined}
                onClick={() => {
                  if (locked) {
                    navigate('unlock', { replace: true });
                    return;
                  }
                  screen.setMinutes(minutes);
                  setSheet(null);
                }}
              >
                <span className="length-minutes">{minutes} min</span>
                <span className="length-detail">
                  {locked ? (
                    <>
                      <LockIcon /> Lifetime unlock
                    </>
                  ) : (
                    `${breaths} breaths`
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </Sheet>

      <Sheet open={sheet === 'menu'} onClose={() => setSheet(null)} title="Breathwork" name="menu">
        <nav className="menu" aria-label="Pages">
          <Link to="week" replace>
            Your week
          </Link>
          <Link to="custom" replace>
            Custom patterns
          </Link>
          <Link to="science" replace>
            The science
          </Link>
          <Link to="unlock" replace>
            Lifetime unlock
          </Link>
          <Link to="restore" replace>
            Restore purchase
          </Link>
          <Link to="privacy" replace>
            Privacy
          </Link>
        </nav>
      </Sheet>
    </main>
  );
}
