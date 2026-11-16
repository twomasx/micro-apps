import { share } from '@micro/platform';
import { useState } from 'react';
import { ApiError, deleteResult } from '../lib/api.ts';
import { appHref, navigate } from '../lib/navigation.ts';
import { COMPARE_WARNING } from '../lib/result-view.ts';
import { shareMessage } from '../lib/share-message.ts';
import { removeResult, type SavedResult } from '../lib/store.ts';
import { TESTS, type TestKind } from '../lib/tests.ts';
import { Link } from './Link.tsx';

function absoluteUrl(path: string): string {
  return `${window.location.origin}${appHref(path)}`;
}

interface ResultActionsProps {
  id: string;
  kind: TestKind;
  /** Set when this result was taken on this device. */
  own: SavedResult | undefined;
  /** The title shared with the result link, like "My personality type is INTJ". */
  shareTitle: string;
}

/** Share, compare with someone, take the test yourself, delete: the same on every result page. */
export function ResultActions({ id, kind, own, shareTitle }: ResultActionsProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const testPath = TESTS[kind].path;

  const shareResult = async () => {
    setMessage(shareMessage(await share({ title: shareTitle, url: absoluteUrl(`r/${id}`) })));
  };

  const shareCompareLink = async () => {
    const title =
      kind === 'big-five'
        ? 'Take this Big Five test and compare your result with mine'
        : 'Take this personality test and compare your result with mine';
    setMessage(shareMessage(await share({ title, url: absoluteUrl(`${testPath}?with=${id}`) })));
  };

  const deleteOwn = async () => {
    if (!own) return;
    if (!window.confirm('Delete this result? This cannot be undone.')) return;
    setDeleting(true);
    try {
      try {
        await deleteResult(id, own.deleteToken);
      } catch (cause) {
        // 404: already gone, for example when the first try worked but its answer was lost.
        if (!(cause instanceof ApiError && cause.status === 404)) throw cause;
      }
      await removeResult(id);
      navigate(testPath, { replace: true });
    } catch {
      setDeleting(false);
      setMessage('The result could not be deleted. Try again.');
    }
  };

  return (
    <>
      <section className="result-share">
        <button type="button" className="result-share-button" onClick={() => void shareResult()}>
          Share this result
        </button>
      </section>

      {own ? (
        <section className="result-compare">
          <h2 className="result-compare-title">Compare with someone</h2>
          <p className="result-compare-warning">{COMPARE_WARNING}</p>
          <button type="button" className="result-compare-button" onClick={() => void shareCompareLink()}>
            Send a compare link
          </button>
        </section>
      ) : (
        <p className="result-take-test">
          <Link to={testPath} className="result-take-test-link">
            Take the test yourself
          </Link>
        </p>
      )}

      {message && (
        <p className="result-message" role="status">
          {message}
        </p>
      )}

      {own && (
        <section className="result-delete">
          <button type="button" className="result-delete-button" onClick={() => void deleteOwn()} disabled={deleting}>
            Delete this result
          </button>
        </section>
      )}
    </>
  );
}
