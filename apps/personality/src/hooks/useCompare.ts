import { useEffect, useState } from 'react';
import { ApiError, fetchCompare, type AnyCompare } from '../lib/api.ts';

export type CompareState =
  | { status: 'loading' }
  | { status: 'ready'; compare: AnyCompare }
  | { status: 'notFound' }
  | { status: 'error' };

/** Loads the comparison of two results. Mount it with a key made of both ids so each pair starts fresh. */
export function useCompare(a: string, b: string): { state: CompareState; retry: () => void } {
  const [state, setState] = useState<CompareState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchCompare(a, b).then(
      (compare) => {
        if (!cancelled) setState({ status: 'ready', compare });
      },
      (cause: unknown) => {
        if (cancelled) return;
        // 400 is the same result twice, 409 two different tests or versions: neither can be compared.
        const missing = cause instanceof ApiError && [400, 404, 409].includes(cause.status);
        setState({ status: missing ? 'notFound' : 'error' });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [a, b, attempt]);

  const retry = () => {
    setState({ status: 'loading' });
    setAttempt((count) => count + 1);
  };

  return { state, retry };
}
