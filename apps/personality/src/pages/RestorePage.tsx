import { PASS_MESSAGES, restoreCode, type RestoreResult } from '@micro/payments/pass';
import { formatCode, normalizeCode } from '@micro/payments/unlock-codes';
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from '../components/Link.tsx';
import { pass } from '../lib/access.ts';
import { checkCodeForRestore } from '../lib/api.ts';
import { unlockWithCode } from '../lib/unlock.ts';

type Status = 'idle' | 'checking' | 'own' | 'pass' | Exclude<RestoreResult, 'own' | 'pass'>;

const MESSAGES: Record<Exclude<Status, 'idle' | 'own' | 'pass'>, string> = {
  checking: 'Checking your code.',
  invalid: 'This code was not found. Check it and try again.',
  malformed: 'A code has 16 letters and numbers, like 7K3M-Q9TD-2XWB-HC4R.',
  refunded: PASS_MESSAGES.refunded,
  disputed: PASS_MESSAGES.disputed,
  device_limit: PASS_MESSAGES.device_limit,
  rate_limited: PASS_MESSAGES.rate_limited,
  offline: 'We could not reach the server. Check your connection and try again.',
};

/** Enter a Personality unlock code or an all-app pass code. Either one unlocks everything in Personality. */
export function RestorePage({ back }: { back: string | null }) {
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setStatus('checking');
    // Its own unlock code first, then the all-app pass.
    void restoreCode(input, {
      normalizeOwn: normalizeCode,
      checkOwn: checkCodeForRestore,
      useOwn: (code) => unlockWithCode(formatCode(code)),
      pass,
    }).then(setStatus);
  };

  const backLink = back ? (
    <Link to={back} className="restore-back">
      {back.startsWith('c/') ? 'Back to the comparison' : 'Back to the report'}
    </Link>
  ) : (
    <Link to="" className="restore-back">
      Go to the personality test
    </Link>
  );

  if (status === 'own' || status === 'pass') {
    return (
      <main className="restore-page" data-state="unlocked">
        <p className="restore-kicker">Personality</p>
        <h1 className="restore-title">{status === 'pass' ? 'Your pass is on' : 'Personality is unlocked'}</h1>
        <p role="status" className="restore-intro">
          Every full report, the Big Five report and every couple report are unlocked on this device.
        </p>
        <p>{backLink}</p>
      </main>
    );
  }

  return (
    <main className="restore-page" data-state={status}>
      <p className="restore-kicker">Personality</p>
      <h1 className="restore-title">Enter your code</h1>
      <p className="restore-intro">
        Enter the unlock code you saved after buying. A PolymadLabs pass code works here too. Either one unlocks everything in
        Personality on this device.
      </p>
      <form className="restore-form" onSubmit={submit} noValidate>
        <label className="restore-label" htmlFor="restore-code">
          Unlock or pass code
        </label>
        <input
          id="restore-code"
          className="restore-input"
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
          maxLength={40}
          aria-describedby="restore-status"
          aria-invalid={status === 'invalid' || status === 'malformed'}
        />
        <button type="submit" className="restore-submit" disabled={status === 'checking'}>
          {status === 'checking' ? 'Checking' : 'Use this code'}
        </button>
        <p id="restore-status" role="status" className="restore-status">
          {status === 'idle' ? '' : MESSAGES[status]}
        </p>
      </form>
      <p>
        No code yet?{' '}
        <Link to={back ? `unlock?back=${encodeURIComponent(back)}` : 'unlock'} className="restore-inline-link">
          See the lifetime unlock
        </Link>
      </p>
      <p>{backLink}</p>
    </main>
  );
}
