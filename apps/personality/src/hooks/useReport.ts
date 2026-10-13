import { useEffect, useState } from 'react';
import { ApiError, fetchReport, fetchResult, type PublicResult } from '../lib/api.ts';
import { navigate } from '../lib/navigation.ts';
import type { Report } from '../lib/report.ts';

export type ReportState =
  | { status: 'loading' }
  | { status: 'ready'; report: Report }
  /** Not paid. `unconfirmed` is true when the buyer came back from Checkout and it still is not paid. */
  | { status: 'locked'; result: PublicResult; unconfirmed: boolean }
  | { status: 'notFound' }
  | { status: 'error' };

async function load(id: string, sessionId: string | null): Promise<ReportState> {
  const result = await fetchResult(id);
  // Only ask for the report when it should be there, so a locked report is not a failed request.
  if (!result.unlocked && sessionId === null) {
    return { status: 'locked', result, unconfirmed: false };
  }
  try {
    return { status: 'ready', report: await fetchReport(id, sessionId) };
  } catch (cause) {
    if (!(cause instanceof ApiError) || cause.status !== 402) throw cause;
    // The server decides what is paid. 402 means the payment is not confirmed.
    return { status: 'locked', result, unconfirmed: sessionId !== null };
  }
}

/**
 * Loads the paid report. `sessionId` is the Checkout session from the return URL;
 * the server uses it to confirm the payment if the webhook has not arrived yet.
 * Mount it with `key={id}` so each id starts fresh.
 */
export function useReport(
  id: string,
  sessionId: string | null,
): { state: ReportState; retry: () => void } {
  const [state, setState] = useState<ReportState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  // Keep the session from the first render: the URL loses it once the report opens.
  const [session] = useState(sessionId);

  useEffect(() => {
    let cancelled = false;
    load(id, session).then(
      (next) => {
        if (cancelled) return;
        setState(next);
        // A reload or a shared link should not carry the session id.
        if (next.status === 'ready' && session) navigate(`r/${id}/report`, { replace: true });
      },
      (cause: unknown) => {
        if (cancelled) return;
        const missing = cause instanceof ApiError && cause.status === 404;
        setState({ status: missing ? 'notFound' : 'error' });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [id, session, attempt]);

  const retry = () => {
    setState({ status: 'loading' });
    setAttempt((count) => count + 1);
  };

  return { state, retry };
}
