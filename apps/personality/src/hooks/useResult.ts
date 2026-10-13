import { useEffect, useState } from 'react';
import { ApiError, fetchResult, type PublicResult } from '../lib/api.ts';

export type ResultState =
  | { status: 'loading' }
  | { status: 'ready'; result: PublicResult }
  | { status: 'notFound' }
  | { status: 'error' };

/** Loads one result from the API. Mount it with `key={id}` so each id starts fresh. */
export function useResult(id: string): { state: ResultState; retry: () => void } {
  const [state, setState] = useState<ResultState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchResult(id).then(
      (result) => {
        if (!cancelled) setState({ status: 'ready', result });
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
  }, [id, attempt]);

  const retry = () => {
    setState({ status: 'loading' });
    setAttempt((count) => count + 1);
  };

  return { state, retry };
}
