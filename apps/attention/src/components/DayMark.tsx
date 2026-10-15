import { PROGRAM_DAYS } from '../lib/program';

/** Top right of Today: a thin hand-drawn open circle with the practice day inside, "of 30" under it. */
export function DayMark({ day }: { day: number }) {
  return (
    <p className="day-mark">
      <span className="visually-hidden">
        Day {day} of {PROGRAM_DAYS}
      </span>
      <svg className="day-mark-ring" viewBox="0 0 48 48" aria-hidden="true">
        <path d="M18.2 5.9c4.6-1.6 10.4-1.4 14.9 1C39.6 10.2 43.6 17 43.2 24.4 42.7 33.9 34.9 42.4 24.6 42.9 14.6 43.4 5.7 35.9 5.1 25.6 4.7 19.6 7.2 13.9 11.4 10.1" />
      </svg>
      <span className="day-mark-number" aria-hidden="true">
        {day}
      </span>
      <span className="day-mark-of" aria-hidden="true">
        of {PROGRAM_DAYS}
      </span>
    </p>
  );
}
