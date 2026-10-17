import { useEffect, useState } from 'react';
import { createToken, fetchAppLinks, type AppLink } from '../lib/api';
import { leaveTo } from '../lib/navigation';

/** Where a link goes with its one-time token. */
export function withToken(url: string, token: string): string {
  const target = new URL(url, window.location.origin);
  target.searchParams.set('passToken', token);
  return target.href;
}

/**
 * A button per app. A tap makes a one-time token and opens the app with it, so the app unlocks with no
 * typing, even on another domain. The token is made on tap, so it is fresh: it works once, for 10 minutes.
 */
export function AppLinks({ code }: { code: string }) {
  const [links, setLinks] = useState<AppLink[] | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let current = true;
    fetchAppLinks().then(
      (value) => current && setLinks(value),
      () => current && setFailed(true),
    );
    return () => {
      current = false;
    };
  }, []);

  const open = (link: AppLink) => {
    setOpening(link.url);
    setFailed(false);
    createToken(code).then(
      (token) => leaveTo(withToken(link.url, token)),
      () => {
        setOpening(null);
        setFailed(true);
      },
    );
  };

  return (
    <section className="app-links" aria-labelledby="apps-title">
      <div className="section-head">
        <h2 id="apps-title" className="app-links-title">
          Open an app with your pass
        </h2>
        {links && <p className="section-count">{links.length} apps</p>}
      </div>
      {links === null && !failed && (
        <p role="status" className="app-links-loading">
          Loading the apps.
        </p>
      )}
      <ol className="app-links-list">
        {links?.map((link, index) => (
          <li key={link.url} className="app-link" data-app={link.app}>
            <button
              type="button"
              className="app-link-button"
              onClick={() => open(link)}
              disabled={opening !== null}
              aria-busy={opening === link.url}
              data-state={opening === link.url ? 'opening' : 'idle'}
            >
              <span className="app-link-number" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="app-link-name">
                {opening === link.url ? `Opening ${link.name}` : `Open ${link.name}`}
              </span>
              <span className="app-link-arrow" aria-hidden="true">
                &#8594;
              </span>
            </button>
          </li>
        ))}
      </ol>
      <p role="status" className="app-links-status">
        {failed ? 'This did not work. Check your connection and try again, or type your code in the app.' : ''}
      </p>
    </section>
  );
}
