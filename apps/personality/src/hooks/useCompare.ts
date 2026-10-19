import { useEffect, useState } from 'react';
import { ApiError, fetchCompare } from '../lib/api.ts';
import type { CompareResponse } from '../lib/compare.ts';
import { navigate } from '../lib/navigation.ts';

export type CompareState =
  | { status: 'loading' }
  /**
   * `unconfirmed` is true when the buyer came back from Checkout and it still is not paid. A payment that was
   * refunded or disputed is not unconfirmed: the response says `revoked`.
   */
  | { status: 'ready'; compare: CompareResponse; unconfirmed: boolean }
  | { status: 'notFound' }
  | { status: 'error' };

/**
 * Loads the comparison of two results. `sessionId` is the Checkout session from the return URL.
 * Mount it with a key made of both ids so each pair starts fresh.
 */
export function useCompare(
  a: string,
  b: string,
  sessionId: string | null,
): { state: CompareState; retry: () => void } {
  const [state, setState] = useState<CompareState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  // Keep the session from the first render: the URL loses it once the report opens.
  const [session] = useState(sessionId);

  useEffect(() => {
    let cancelled = false;
    fetchCompare(a, b, session).then(
      (compare) => {
        if (cancelled) return;
        setState({ status: 'ready', compare, unconfirmed: session !== null && !compare.unlocked && !compare.revoked });
        // A reload or a shared link should not carry the session id.
        if (session && compare.unlocked) navigate(`c/${a}/${b}`, { replace: true });
      },
      (cause: unknown) => {
        if (cancelled) return;
        // 400 is the same result twice, 409 two versions of the test: neither can be compared.
        const missing = cause instanceof ApiError && [400, 404, 409].includes(cause.status);
        setState({ status: missing ? 'notFound' : 'error' });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [a, b, session, attempt]);

  const retry = () => {
    setState({ status: 'loading' });
    setAttempt((count) => count + 1);
  };

  return { state, retry };
}
