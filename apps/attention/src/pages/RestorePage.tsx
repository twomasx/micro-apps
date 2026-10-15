import { useState, type FormEvent } from 'react';
import { Link } from '../components/Link';
import { useUnlocked } from '../hooks/useUnlocked';
import { checkCode } from '../lib/api';
import { unlockWithCode } from '../lib/unlock-state';
import { formatCode, normalizeCode } from '@micro/payments/unlock-codes';

type Status = 'idle' | 'checking' | 'unlocked' | 'invalid' | 'malformed' | 'offline';

const MESSAGES: Record<Exclude<Status, 'idle' | 'unlocked'>, string> = {
  checking: 'Checking your code.',
  invalid: 'This code was not found. Check it and try again.',
  malformed: 'An unlock code has 16 letters and numbers, like 7K3M-Q9TD-2XWB-HC4R.',
  offline: 'We could not reach the server. Check your connection and try again.',
};

export function RestorePage() {
  const unlocked = useUnlocked();
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const code = normalizeCode(input);
    if (!code) {
      setStatus('malformed');
      return;
    }
    setStatus('checking');
    checkCode(code).then(
      async (valid) => {
        if (!valid) {
          setStatus('invalid');
          return;
        }
        await unlockWithCode(formatCode(code));
        setStatus('unlocked');
      },
      () => setStatus('offline'),
    );
  };

  return (
    <main className="screen page restore">
      <p>
        <Link to="" className="page-back">
          Back to today
        </Link>
      </p>
      <h1 className="title">Restore purchase</h1>

      {status === 'unlocked' ? (
        <>
          <p role="status" className="page-strong">
            Attention is unlocked on this device.
          </p>
          <Link to="" className="button button-primary">
            Back to today
          </Link>
        </>
      ) : (
        <>
          <p>
            Enter the unlock code you saved after buying. It unlocks Attention on this device.
            {unlocked && ' Attention is already unlocked here.'}
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
            <button type="submit" className="button button-primary" disabled={status === 'checking'}>
              Restore
            </button>
            <p id="code-status" role="status" className="page-status">
              {status === 'idle' ? '' : MESSAGES[status]}
            </p>
          </form>
          <p className="section-help">
            No code yet?{' '}
            <Link to="unlock">
              See the lifetime unlock
            </Link>
          </p>
        </>
      )}
    </main>
  );
}
