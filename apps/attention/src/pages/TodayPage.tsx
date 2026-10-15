import { useState } from 'react';
import { DayMark } from '../components/DayMark';
import { EnsoCanvas } from '../components/EnsoCanvas';
import { EnsoRow } from '../components/EnsoRow';
import { Link } from '../components/Link';
import { SettingsSheet } from '../components/SettingsSheet';
import { UnlockOffer } from '../components/UnlockOffer';
import { useToday } from '../hooks/useToday';
import { updateSettings } from '../lib/app-data';
import { clock } from '../lib/format';
import { allowedSizes, ALL_SIZES, type SessionSize } from '../lib/limits';
import { navigate } from '../lib/navigation';
import { studyMinutes } from '../lib/program';
import { summarize } from '../lib/session';

function sizeLabel(size: SessionSize): string {
  return size === 'study' ? 'Study' : `${size} min`;
}

export function TodayPage() {
  const today = useToday();
  const [settingsOpen, setSettingsOpen] = useState(false);
  if (!today.loaded) return <main className="screen today" data-state="loading" aria-busy="true" />;

  const { status, last, prompt, unlocked } = today;
  const allowed = allowedSizes(unlocked);
  const lastSummary = last ? summarize(last.stretches) : null;

  return (
    <main className="screen today" data-practiced={status.practicedToday}>
      <header className="top">
        <div className="top-text">
          <h1 className="title">
            One breath,
            <br />
            one circle
          </h1>
          <p className="lead">
            {status.practicedToday ? 'You practiced today. Another session is fine too.' : 'The brush draws while you focus.'}
          </p>
        </div>
        <DayMark day={status.dayNumber} />
      </header>

      <section className="stage" aria-label="Next stretch">
        <EnsoCanvas className="stage-canvas" seed={7.3} progress={0} guide />
        <p className="stage-time">
          <span className="stage-time-value">{clock(today.level)}</span>
          <span className="stage-time-label">next stretch</span>
        </p>
      </section>

      {last && lastSummary && (
        <section className="last-session" aria-labelledby="last-title">
          <h2 id="last-title" className="section-label">
            Last session
          </h2>
          <EnsoRow sessionId={last.id} stretches={last.stretches} />
          <p className="last-session-facts">
            {lastSummary.stayed} of {lastSummary.stretches} stretches held. {clock(lastSummary.focusSeconds)} of focus.
          </p>
        </section>
      )}

      {prompt && (
        <section className="test-prompt" data-kind={prompt.kind} aria-labelledby="test-prompt-title">
          <h2 id="test-prompt-title" className="test-prompt-title">
            {prompt.kind === 'baseline' ? 'Before you start: take the attention test' : "This week's attention test"}
          </h2>
          <p>
            {prompt.kind === 'baseline'
              ? 'It takes about 2 minutes and shows where you start, so you can compare later.'
              : `You have practiced ${prompt.afterDay} days. The test takes about 2 minutes.`}
          </p>
          <Link to="test" className="button button-quiet">
            Take the test
          </Link>
        </section>
      )}

      {today.canTrain ? (
        <section className="start" aria-label="Start a session">
          <fieldset className="sizes">
            <legend className="section-label">Focus time</legend>
            <div className="size-options">
              {ALL_SIZES.map((size) => {
                const locked = !allowed.includes(size);
                return (
                  <label key={size} className="size-option" data-locked={locked} data-selected={today.size === size}>
                    <input
                      type="radio"
                      name="size"
                      value={size}
                      checked={today.size === size}
                      disabled={locked}
                      onChange={() => updateSettings({ size })}
                    />
                    <span>{sizeLabel(size)}</span>
                  </label>
                );
              })}
            </div>
            <p className="sizes-note">
              {unlocked ? (
                today.size === 'study' ? (
                  `The study schedule: ${studyMinutes(status.dayNumber)} minutes today, as in the study's week ${Math.min(6, Math.ceil(status.dayNumber / 5))}.`
                ) : (
                  'Minutes of focus time, not counting the pauses.'
                )
              ) : (
                <>
                  Longer sessions and the study schedule come with the <Link to="unlock">lifetime unlock</Link>.
                </>
              )}
            </p>
          </fieldset>
          <button type="button" className="button button-primary begin" onClick={() => navigate('session')}>
            Begin
          </button>
        </section>
      ) : (
        <UnlockOffer />
      )}

      <nav className="page-nav" aria-label="More">
        <Link to="progress">Progress</Link>
        <Link to="test">Attention test</Link>
        <Link to="science">The science</Link>
        <Link to="privacy">Privacy</Link>
        <button type="button" className="text-button" onClick={() => setSettingsOpen(true)}>
          Settings
        </button>
      </nav>

      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} settings={today.settings} />
    </main>
  );
}
