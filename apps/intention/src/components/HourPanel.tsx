import { useNow } from '../hooks/useNow.ts';
import { formatZ, totalVerdict } from '../lib/copy.ts';
import { eventDate, runsByPeople } from '../lib/global-copy.ts';
import { calendarFile, formatCountdown, HOUR, hourStatus, hourWhen } from '../lib/hour.ts';
import type { HourAnswer } from '../lib/totals-types.ts';

/** Downloads the daily event as a small calendar file. */
export function downloadCalendar(now: number): void {
  const url = `${window.location.origin}${import.meta.env.BASE_URL}`;
  const ics = calendarFile(hourStatus(now).event, url);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  link.download = 'intention-hour.ics';
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
}

/** Intention Hour on the global page: when it is, its combined result and the recent ones. */
export function HourPanel({ hour }: { hour: HourAnswer | null }) {
  const now = useNow(1000);
  const status = hourStatus(now);
  return (
    <section className="hour" aria-labelledby="hour-title" data-live={status.kind === 'live'}>
      <h2 id="hour-title">Intention Hour</h2>
      <p>
        Every day at {hourWhen(status.event)}, everyone runs at the same time for {HOUR.minutes} minutes. Runs in
        that window also count in a result of their own.
      </p>
      <p className="hour-status">
        {status.kind === 'live'
          ? `Live now. ${formatCountdown(status.leftMs)} left.`
          : `Next one in ${formatCountdown(status.event.startsAt - now)}.`}
      </p>
      <button type="button" className="button-secondary" onClick={() => downloadCalendar(now)}>
        Add to calendar
      </button>

      {hour && hour.all.runs > 0 ? (
        <>
          <p className="hour-total">
            <b>{formatZ(hour.all.combinedZ)}</b> {totalVerdict(hour.all.combinedZ, hour.all.runs, 'the Intention Hour total')}
          </p>
          <table className="table">
            <caption className="visually-hidden">Recent Intention Hours</caption>
            <thead>
              <tr>
                <th scope="col">Day</th>
                <th scope="col">Joined</th>
                <th scope="col">Score</th>
              </tr>
            </thead>
            <tbody>
              {hour.events.map((event) => (
                <tr key={event.key}>
                  <th scope="row">{eventDate(event.key)}</th>
                  <td>{runsByPeople(event)}</td>
                  <td className="num">{formatZ(event.combinedZ)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <p className="muted">No Intention Hour runs yet.</p>
      )}
    </section>
  );
}
