import { useEffect, useState } from 'react';
import { ApiError, fetchReport, fetchResult, type AnyReport, type PublicResult } from '../lib/api.ts';

export type ReportState =
  | { status: 'loading' }
  | { status: 'ready'; report: AnyReport }
  /** This device has no unlock code or pass that opens it. */
  | { status: 'locked'; result: PublicResult }
  | { status: 'notFound' }
  | { status: 'error' };

async function load(id: string): Promise<ReportState> {
  const result = await fetchResult(id);
  // Only ask for the report when it should be there, so a locked report is not a failed request.
  if (!result.unlocked) return { status: 'locked', result };
  try {
    return { status: 'ready', report: await fetchReport(id) };
  } catch (cause) {
    // The server decides. 402 means the code or pass stopped counting between the two requests.
    if (cause instanceof ApiError && cause.status === 402) return { status: 'locked', result };
    throw cause;
  }
}

/** Loads the paid report for one result of either test. Mount it with `key={id}` so each id starts fresh. */
export function useReport(id: string): { state: ReportState; retry: () => void } {
  const [state, setState] = useState<ReportState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    load(id).then(
      (next) => {
        if (!cancelled) setState(next);
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
