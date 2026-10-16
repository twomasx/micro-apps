import { useEffect, useState } from 'react';
import { AppLinks } from '../components/AppLinks';
import { CodeCard } from '../components/CodeCard';
import { Link } from '../components/Link';
import { ApiError, fetchPurchase } from '../lib/api';
import { CONTACT_LINE } from '../lib/copy';
import { pass } from '../lib/pass-state';

type State =
  | { kind: 'checking' }
  | { kind: 'paid'; code: string }
  | { kind: 'pending' }
  | { kind: 'notFound' }
  | { kind: 'offline' };

export const CONFIRM_ATTEMPTS = 8;
export const CONFIRM_DELAY_MS = 1_500;

/** Asks the server about a returning buyer's payment a few times before giving up for now. */
async function confirm(sessionId: string, cancelled: () => boolean): Promise<State> {
  for (let attempt = 0; attempt < CONFIRM_ATTEMPTS; attempt++) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, CONFIRM_DELAY_MS));
    if (cancelled()) return { kind: 'checking' };
    try {
      const answer = await fetchPurchase(sessionId);
      if (answer.paid) return { kind: 'paid', code: answer.code };
    } catch (error) {
      return error instanceof ApiError && error.status === 404 ? { kind: 'notFound' } : { kind: 'offline' };
    }
  }
  return { kind: 'pending' };
}

export function ThanksPage({ sessionId }: { sessionId: string | null }) {
  const [state, setState] = useState<State>(sessionId ? { kind: 'checking' } : { kind: 'notFound' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    void confirm(sessionId, () => cancelled).then(async (result) => {
      if (cancelled) return;
      // Keep the pass on this device too, so the pass page and the home page can open apps with it.
      if (result.kind === 'paid') await pass.useCode(result.code);
      setState(result);
    });
    return () => {
      cancelled = true;
    };
  }, [sessionId, attempt]);

  const retry = (
    <button
      type="button"
      onClick={() => {
        setState({ kind: 'checking' });
        setAttempt((n) => n + 1);
      }}
    >
      Check again
    </button>
  );

  let body;
  switch (state.kind) {
    case 'checking':
      body = <p role="status">Checking your payment.</p>;
      break;
    case 'paid':
      body = (
        <>
          <p role="status" className="thanks-lead">
            Thank you. Your pass is ready.
          </p>
          <CodeCard code={state.code} />
          <AppLinks code={state.code} />
        </>
      );
      break;
    case 'pending':
      body = (
        <>
          <p role="status">Your payment is not confirmed yet. This can take a minute.</p>
          {retry}
        </>
      );
      break;
    case 'offline':
      body = (
        <>
          <p role="status">We could not reach the server to check your payment. Check your connection and try again.</p>
          {retry}
        </>
      );
      break;
    case 'notFound':
      body = (
        <>
          <p role="status">We could not find this payment.</p>
          <p>
            If you paid and have your pass code, <Link to="restore">enter it here</Link>. {CONTACT_LINE}
          </p>
        </>
      );
      break;
  }

  return (
    <main className="thanks" data-state={state.kind}>
      <h1>PolymadLabs pass</h1>
      {body}
    </main>
  );
}
