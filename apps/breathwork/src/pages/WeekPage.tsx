import { useEffect, useState } from 'react';
import { Link } from '../components/Link';
import { MiniShape } from '../components/TechniquePicker';
import { useUnlocked } from '../hooks/useUnlocked';
import {
  addWeeks,
  dateKey,
  earliestWeek,
  weekDays,
  weekdayName,
  weekLabel,
  weekStart,
  weekSummary,
  type SessionRecord,
  type WeekDay,
} from '../lib/history';
import { getProduct, priceLine } from '../lib/products';
import { loadHistory } from '../lib/store';
import { techniques } from '../lib/techniques';
import { UNLOCK_ADDS } from '../lib/unlock-copy';
import '../styles/page.css';

/** A made-up week for the preview: a few sessions on some days, none on others. */
function exampleWeek(start: Date): WeekDay[] {
  const plan: [day: number, hour: number, techniqueIndex: number, minutes: number][] = [
    [0, 7, 0, 5],
    [1, 22, 2, 3],
    [2, 7, 0, 5],
    [2, 13, 1, 3],
    [4, 8, 3, 10],
    [5, 21, 2, 5],
  ];
  const records: SessionRecord[] = plan.map(([day, hour, index, minutes], i) => {
    const technique = techniques[index]!;
    return {
      id: `example-session-${i}`,
      at: new Date(start.getFullYear(), start.getMonth(), start.getDate() + day, hour).getTime(),
      techniqueId: technique.id,
      name: technique.name,
      phases: technique.phases.map(({ kind, ms }) => ({ kind, ms })),
      durationMs: minutes * 60_000,
    };
  });
  return weekDays(records, start);
}

function Days({ days, today }: { days: WeekDay[]; today: string }) {
  return (
    <ol className="week">
      {days.map((day) => (
        <li key={day.key} className="week-day" data-today={day.key === today || undefined} data-empty={day.records.length === 0 || undefined}>
          <p className="week-date">
            <span className="week-name">{weekdayName(day.date)}</span> <span className="week-number">{day.date.getDate()}</span>
          </p>
          {day.records.length > 0 && (
            <ul className="week-shapes">
              {day.records.map((record) => (
                <li key={record.id} className="week-shape">
                  <MiniShape phases={record.phases} />
                  <span className="visually-hidden">
                    {record.name}, {Math.round(record.durationMs / 60_000)} min
                  </span>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}

export function WeekPage() {
  const unlocked = useUnlocked();
  const [records, setRecords] = useState<SessionRecord[] | null>(null);
  const [offset, setOffset] = useState(0);
  const now = new Date();
  const thisWeek = weekStart(now);

  useEffect(() => {
    let live = true;
    void loadHistory().then((loaded) => {
      if (live) setRecords(loaded);
    });
    return () => {
      live = false;
    };
  }, []);

  const start = addWeeks(thisWeek, offset);
  const earliest = earliestWeek(records ?? [], now);
  const canGoBack = start.getTime() > earliest.getTime();

  return (
    <main className="page">
      <p>
        <Link to="" className="page-back">
          Back to breathing
        </Link>
      </p>
      <h1 className="page-title">Your week</h1>

      {unlocked ? (
        <>
          <div className="week-nav">
            <button
              type="button"
              className="week-step"
              aria-label="Earlier week"
              disabled={!canGoBack}
              onClick={() => setOffset((n) => n - 1)}
            >
              <span className="week-arrow" data-direction="back" />
            </button>
            <p className="week-label" aria-live="polite">
              {offset === 0 ? 'This week' : weekLabel(start)}
              {offset === 0 && <span className="week-sub">{weekLabel(start)}</span>}
            </p>
            <button
              type="button"
              className="week-step"
              aria-label="Later week"
              disabled={offset === 0}
              onClick={() => setOffset((n) => Math.min(0, n + 1))}
            >
              <span className="week-arrow" data-direction="forward" />
            </button>
          </div>
          {records !== null && (
            <>
              <p className="page-strong">{weekSummary(weekDays(records, start))}</p>
              <Days days={weekDays(records, start)} today={dateKey(now)} />
            </>
          )}
          <p>Every session you finish leaves a small copy of its shape on its day.</p>
        </>
      ) : (
        <>
          <p className="page-strong">
            Every session you finish leaves a small copy of its shape on its day. Your week is part of the lifetime
            unlock.
          </p>
          <div className="week-example">
            <p className="week-example-label">Example</p>
            <Days days={exampleWeek(thisWeek)} today="" />
          </div>
          <ul className="page-list">
            {UNLOCK_ADDS.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="price-line">{priceLine(getProduct('lifetime'))}</p>
          <Link to="unlock" className="page-button">
            See the lifetime unlock
          </Link>
        </>
      )}
    </main>
  );
}
