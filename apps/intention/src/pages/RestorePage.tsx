import { useState, type FormEvent } from 'react';
import { Link } from '../components/Link.tsx';
import { useUnlocked } from '../hooks/useUnlocked.ts';
import { checkCodeForRestore } from '../lib/api.ts';
import { pass } from '../lib/pass-state.ts';
import { unlockWithCode } from '../lib/unlock-state.ts';
import { PASS_MESSAGES, restoreCode, type RestoreResult } from '@micro/payments/pass';
import { formatCode, normalizeCode } from '@micro/payments/unlock-codes';

type Status = 'idle' | 'checking' | 'unlocked' | Exclude<RestoreResult, 'own' | 'pass'>;

const MESSAGES: Record<Exclude<Status, 'idle' | 'unlocked'>, string> = {
  checking: 'Checking your code.',
  invalid: 'This code was not found. Check it and try again.',
  malformed: 'A code has 16 letters and numbers, like 7K3M-Q9TD-2XWB-HC4R.',
  refunded: PASS_MESSAGES.refunded,
  disputed: PASS_MESSAGES.disputed,
  device_limit: PASS_MESSAGES.device_limit,
  rate_limited: PASS_MESSAGES.rate_limited,
  offline: 'We could not reach the server. Check your connection and try again.',
};

export function RestorePage() {
  const unlocked = useUnlocked();
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setStatus('checking');
    // Its own unlock code first, then the all-app pass.
    void restoreCode(input, {
      normalizeOwn: normalizeCode,
      checkOwn: checkCodeForRestore,
      useOwn: (code) => unlockWithCode(formatCode(code)),
      pass,
    }).then((result) => setStatus(result === 'own' || result === 'pass' ? 'unlocked' : result));
  };

  return (
    <main className="page restore">
      <nav className="page-nav">
        <Link to="" className="back-link">
          Back to Intention
        </Link>
      </nav>
      <h1 className="page-title">Restore Lab Pass</h1>

      {status === 'unlocked' ? (
        <>
          <p role="status" className="lead">
            Lab Pass is on for this device.
          </p>
          <Link to="" className="button-primary">
            Back to Intention
          </Link>
        </>
      ) : (
        <>
          <p>
            Enter the unlock code you saved after buying. It turns Lab Pass on for this device. A PolymadLabs pass code works here too.
            {unlocked && ' Lab Pass is already on here.'}
          </p>
          <form className="code-form" onSubmit={submit} noValidate>
            <label className="code-label" htmlFor="code">
              Unlock code
            </label>
            <input
              id="code"
              className="code-input"
              name="code"
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                if (status !== 'checking') setStatus('idle');
              }}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              autoComplete="off"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
              maxLength={40}
              aria-describedby="code-status"
              aria-invalid={status === 'invalid' || status === 'malformed'}
            />
            <button type="submit" className="button-primary" disabled={status === 'checking'}>
              Restore
            </button>
            <p id="code-status" role="status" className="status-line">
              {status === 'idle' ? '' : MESSAGES[status]}
            </p>
          </form>
          <p className="muted">
            No code yet?{' '}
            <Link to="unlock">
              See Lab Pass
            </Link>
          </p>
        </>
      )}
    </main>
  );
}
