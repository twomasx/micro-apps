import { EnsoRow } from '../components/EnsoRow';
import { Link } from '../components/Link';
import { useToday } from '../hooks/useToday';
import { clock } from '../lib/format';
import { navigate } from '../lib/navigation';
import { summarize, type SessionState } from '../lib/session';

interface SessionCompleteProps {
  sessionId: string;
  state: SessionState;
}

/** The end of a session: every circle from it, laid out like a line of brushwork. */
export function SessionComplete({ sessionId, state }: SessionCompleteProps) {
  const { prompt } = useToday();
  const summary = summarize(state.stretches);
  const finished = state.focusSeconds >= state.targetSeconds;

  return (
    <main className="screen complete" data-finished={finished}>
      <header className="complete-head">
        <h1 className="title">{finished ? 'Session complete' : 'Session ended'}</h1>
        <p className="lead">
          {finished ? `${clock(summary.focusSeconds)} of focus.` : `${clock(summary.focusSeconds)} of focus before you stopped.`}
        </p>
      </header>

      <EnsoRow sessionId={sessionId} stretches={state.stretches} className="enso-row complete-row" />

      <dl className="facts">
        <div className="fact">
          <dt>Stretches held</dt>
          <dd>
            {summary.stayed} <span className="fact-of">of {summary.stretches}</span>
          </dd>
        </div>
        <div className="fact">
          <dt>Longest held</dt>
          <dd>{summary.longestStayedSeconds > 0 ? clock(summary.longestStayedSeconds) : 'None yet'}</dd>
        </div>
        <div className="fact">
          <dt>Next session starts at</dt>
          <dd>{clock(state.nextSeconds)}</dd>
        </div>
      </dl>

      {summary.probesPlayed > 0 && (
        <p className="probe-summary">
          <span className="tag">Experimental</span> You noticed {summary.probesHeard} of {summary.probesPlayed}{' '}
          {summary.probesPlayed === 1 ? 'tick' : 'ticks'}.
        </p>
      )}

      {prompt?.kind === 'weekly' && (
        <section className="test-prompt" data-kind="weekly" aria-labelledby="complete-test-title">
          <h2 id="complete-test-title" className="test-prompt-title">
            This week's attention test is ready
          </h2>
          <p>It takes about 2 minutes. Compare it with where you started.</p>
          <Link to="test" className="button button-quiet">
            Take the test
          </Link>
        </section>
      )}

      <footer className="session-actions">
        <button type="button" className="button button-primary" onClick={() => navigate('', { replace: true })}>
          Done
        </button>
      </footer>
    </main>
  );
}
