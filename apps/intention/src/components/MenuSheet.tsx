import { useNow } from '../hooks/useNow.ts';
import { HOUR, hourStatus, hourWhen } from '../lib/hour.ts';
import { priceLine } from '../lib/products.ts';
import { RUN_SECONDS, STANDARD_SECONDS, type RunSeconds } from '../lib/protocol.ts';
import { downloadCalendar } from './HourPanel.tsx';
import { Link } from './Link.tsx';
import { Sheet } from './Sheet.tsx';

const MENU: readonly [string, string][] = [
  ['me', 'Your runs'],
  ['global', "Everyone's runs"],
  ['science', 'The science'],
  ['privacy', 'Privacy'],
];

interface Props {
  open: boolean;
  onClose: () => void;
  unlocked: boolean;
  seconds: RunSeconds;
  onSeconds: (seconds: RunSeconds) => void;
}

/** The way to the other pages from the main screen, the run length and Intention Hour. */
export function MenuSheet({ open, onClose, unlocked, seconds, onSeconds }: Props) {
  const now = useNow(60_000);
  return (
    <Sheet open={open} onClose={onClose} title="Intention" name="menu">
      <nav className="menu" aria-label="Pages">
        <ul className="menu-list">
          {/* The sheet has its own history entry, so links replace it. */}
          {MENU.map(([to, label]) => (
            <li key={to}>
              <Link to={to} replace className="menu-link">
                {label}
              </Link>
            </li>
          ))}
          <li>
            <Link to="unlock" replace className="menu-link">
              {unlocked ? 'Lab Pass: on' : 'Lab Pass'}
            </Link>
          </li>
        </ul>
      </nav>

      <fieldset className="menu-length">
        <legend>Run length</legend>
        <div className="segmented">
          {RUN_SECONDS.map((option) => {
            const locked = !unlocked && option !== STANDARD_SECONDS;
            return (
              <label key={option} className="segment" data-locked={locked}>
                <input
                  type="radio"
                  name="run-length"
                  value={option}
                  checked={(unlocked ? seconds : STANDARD_SECONDS) === option}
                  disabled={locked}
                  onChange={() => onSeconds(option)}
                />
                <span>{option} s</span>
              </label>
            );
          })}
        </div>
        {!unlocked && (
          <p className="menu-note">
            60 and 120 second runs come with Lab Pass: {priceLine()}
          </p>
        )}
      </fieldset>

      <section className="menu-hour">
        <h3>Intention Hour</h3>
        <p>
          Every day at {hourWhen(hourStatus(now).event)}, for {HOUR.minutes} minutes.
        </p>
        <button type="button" className="button-secondary" onClick={() => downloadCalendar(Date.now())}>
          Add to calendar
        </button>
      </section>
    </Sheet>
  );
}
