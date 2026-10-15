import { useMemo } from 'react';
import { CircleGrid } from '../components/CircleGrid';
import { InkChart } from '../components/InkChart';
import { Link } from '../components/Link';
import { useAppData } from '../hooks/useAppData';
import { useUnlocked } from '../hooks/useUnlocked';
import { seedFor } from '../ink/seed';
import { scoreDomain, secondsDomain } from '../lib/chart';
import { clock } from '../lib/format';
import { FREE_DAYS, visibleHistory } from '../lib/limits';
import { PROGRAM_DAYS } from '../lib/program';
import { dayRows, nextTestDay, testSeries, weeks } from '../lib/progress';
import type { TestRecord } from '../lib/records';
import { PRACTICE_EFFECT_NOTE } from '../lib/test-copy';

const SHORT_DATE = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

function shortDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return SHORT_DATE.format(new Date(y!, m! - 1, d!));
}

export function ProgressPage() {
  const data = useAppData();
  const unlocked = useUnlocked();
  const shown = useMemo(() => visibleHistory(data.sessions, data.tests, unlocked), [data.sessions, data.tests, unlocked]);
  const rows = useMemo(() => dayRows(shown.sessions), [shown.sessions]);
  const allDays = useMemo(() => dayRows(data.sessions).length, [data.sessions]);

  if (!data.loaded) return <main className="screen page" aria-busy="true" />;

  const groups = weeks(rows);
  const longest = rows.map((r) => r.longestHeldSeconds);
  const next = nextTestDay(allDays);

  return (
    <main className="screen page progress">
      <p>
        <Link to="" className="page-back">
          Back to today
        </Link>
      </p>
      <header>
        <h1 className="title">Progress</h1>
        <p className="lead">
          {allDays === 0
            ? 'Nothing here yet. Your first session leaves its circles here.'
            : `${allDays} of ${PROGRAM_DAYS} practice days. Missed days are not counted, so there are no gaps.`}
        </p>
      </header>

      {shown.hidden && (
        <p className="locked-note">
          Free history shows practice days 1 to {FREE_DAYS} and your latest test. The{' '}
          <Link to="unlock">lifetime unlock</Link> shows everything.
        </p>
      )}

      {rows.length > 1 && (
        <section className="progress-section" aria-labelledby="longest-title">
          <h2 id="longest-title" className="section-title">
            Longest stretch held, by day
          </h2>
          <InkChart
            name="Longest stretch held, by practice day"
            values={longest}
            labels={rows.map((r) => `Day ${r.day}`)}
            format={clock}
            domain={secondsDomain(longest)}
            seed={11.3}
          />
        </section>
      )}

      <TestSection title="Attention test, Quick" tests={testSeries(shown.tests, 'quick')} seed={23.9} />
      <TestSection title="Attention test, Full" tests={testSeries(shown.tests, 'full')} seed={31.1} />
      <p className="progress-next">
        {next === null ? 'The 30 days are done. The test is still here whenever you want it.' : `The next weekly test is after practice day ${next}.`}{' '}
        <Link to="test">Take the test now</Link>
      </p>

      {groups.length > 0 && (
        <section className="progress-section scroll" aria-labelledby="circles-title">
          <h2 id="circles-title" className="section-title">
            Every circle
          </h2>
          <p className="section-help">One circle per stretch. Ink where you stayed, gray where you drifted.</p>
          {groups.map((group) => (
            <section key={group.week} className="week" aria-label={`Week ${group.week}`}>
              <h3 className="week-title">Week {group.week}</h3>
              <ol className="days">
                {group.days.map((row) => (
                  <li key={row.date} className="day">
                    <p className="day-head">
                      <span className="day-number">Day {row.day}</span>
                      <span className="day-date">{shortDate(row.date)}</span>
                    </p>
                    <CircleGrid
                      circles={row.circles.map((c) => ({ seed: seedFor(c.sessionId, c.index), drifted: !c.stretch.stayed }))}
                      size={22}
                      gap={4}
                      label={`Day ${row.day}: ${row.circles.length} stretches, ${row.held} held`}
                    />
                    <p className="day-facts">
                      {row.held} of {row.circles.length} held. Longest {row.longestHeldSeconds > 0 ? clock(row.longestHeldSeconds) : 'none'}.{' '}
                      {clock(row.focusSeconds)} of focus.
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </section>
      )}
    </main>
  );
}

function TestSection({ title, tests, seed }: { title: string; tests: TestRecord[]; seed: number }) {
  if (tests.length === 0) return null;
  const scores = tests.map((t) => t.score.score);
  return (
    <section className="progress-section" aria-labelledby={`${seed}-title`}>
      <h2 id={`${seed}-title`} className="section-title">
        {title}
      </h2>
      <InkChart
        name={`${title}: attention score by test`}
        values={scores}
        labels={tests.map((t) => `Test ${t.nth}, ${shortDate(t.date)}`)}
        format={(v) => String(v)}
        domain={scoreDomain(scores)}
        seed={seed}
      />
      {tests.length > 1 && <p className="section-help">{PRACTICE_EFFECT_NOTE}</p>}
    </section>
  );
}
