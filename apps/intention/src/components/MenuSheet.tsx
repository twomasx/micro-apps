import { useNow } from '../hooks/useNow.ts';
import { HOUR, hourStatus, hourWhen } from '../lib/hour.ts';
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
}

/** The way to the other pages from the tug screen. */
export function MenuSheet({ open, onClose }: Props) {
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
        </ul>
      </nav>
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
