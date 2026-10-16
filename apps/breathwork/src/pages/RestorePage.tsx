import { useState, type FormEvent } from 'react';
import { Link } from '../components/Link';
import { useUnlocked } from '../hooks/useUnlocked';
import { checkCodeForRestore } from '../lib/api';
import { pass } from '../lib/pass-state';
import { unlockWithCode } from '../lib/unlock-state';
import { PASS_MESSAGES, restoreCode, type RestoreResult } from '@micro/payments/pass';
import { formatCode, normalizeCode } from '@micro/payments/unlock-codes';
import '../styles/page.css';

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
    <main className="page">
      <p>
        <Link to="" className="page-back">
          Back to breathing
        </Link>
      </p>
      <h1 className="page-title">Restore purchase</h1>

      {status === 'unlocked' ? (
        <>
          <p role="status" className="page-strong">
            Breathwork is unlocked on this device.
          </p>
          <Link to="" className="page-button">
            Back to breathing
          </Link>
        </>
      ) : (
        <>
          <p>
            Enter the unlock code you saved after buying. It unlocks Breathwork on this device. A PolymadLabs pass code works here too.
            {unlocked && ' Breathwork is already unlocked here.'}
          </p>
          <form className="code-form" onSubmit={submit} noValidate>
            <label className="field-label" htmlFor="code">
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
            <button type="submit" className="page-button" disabled={status === 'checking'}>
              Restore
            </button>
            <p id="code-status" role="status" className="page-status">
              {status === 'idle' ? '' : MESSAGES[status]}
            </p>
          </form>
          <p>
            No code yet?{' '}
            <Link to="unlock" className="inline-link">
              See the lifetime unlock
            </Link>
          </p>
        </>
      )}
    </main>
  );
}
