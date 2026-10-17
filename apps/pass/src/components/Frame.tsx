import type { ReactNode } from 'react';
import { CONTACT_EMAIL } from '../lib/copy';
import { Link } from './Link';

/**
 * The header and footer every pass page shares. The pass belongs to the whole suite, so it wears the
 * landing page's look: the PolymadLabs wordmark, mono labels, thin rules.
 */
export function Frame({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="masthead">
        <div className="masthead-inner">
          <a className="wordmark" href="/" aria-label="PolymadLabs home">
            PolymadLabs
          </a>
          <p className="masthead-label">All-app pass</p>
          <nav className="masthead-nav" aria-label="Pass">
            <Link to="">Pass</Link>
            <Link to="restore">Enter code</Link>
          </nav>
        </div>
      </header>
      {children}
      <footer className="colophon">
        <div className="colophon-inner">
          <div className="colophon-mark">
            <a className="wordmark" href="/">
              PolymadLabs
            </a>
            <p className="motto">Participatory enlightenment.</p>
          </div>
          <ul className="colophon-links">
            <li>
              <Link to="privacy">Privacy</Link>
            </li>
            <li>
              <a href="/terms">Terms of use</a>
            </li>
            <li>
              <a href="/refunds">Refund policy</a>
            </li>
            <li>
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </li>
          </ul>
        </div>
      </footer>
    </>
  );
}
