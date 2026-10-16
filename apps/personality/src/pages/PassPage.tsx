import { PASS_MESSAGES, type UseCodeResult } from '@micro/payments/pass';
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from '../components/Link.tsx';
import { pass } from '../lib/pass-state.ts';

type Status = 'idle' | 'checking' | UseCodeResult;

/** Enter an all-app pass code. With an active pass, every full report and couple report is unlocked. */
export function PassPage({ back }: { back: string | null }) {
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setStatus('checking');
    void pass.useCode(input).then(setStatus);
  };

  const backLink = back ? (
    <Link to={back} className="pass-back">
      {back.startsWith('c/') ? 'Back to the comparison' : 'Back to the report'}
    </Link>
  ) : (
    <Link to="" className="pass-back">
      Back to the test
    </Link>
  );

  if (status === 'active') {
    return (
      <main className="pass-page" data-state="active">
        <h1 className="pass-title">PolymadLabs pass</h1>
        <p role="status">Your pass is on for this device. Every full report and couple report is unlocked.</p>
        <p>{backLink}</p>
      </main>
    );
  }

  const message = status === 'idle' ? '' : status === 'checking' ? 'Checking your code.' : PASS_MESSAGES[status];
  return (
    <main className="pass-page" data-state={status}>
      <h1 className="pass-title">Enter your pass code</h1>
      <p>A PolymadLabs pass unlocks every full report and couple report. Enter the code you saved after buying it.</p>
      <form className="pass-form" onSubmit={submit} noValidate>
        <label className="pass-label" htmlFor="pass-code">
          Pass code
        </label>
        <input
          id="pass-code"
          className="pass-input"
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
          aria-describedby="pass-status"
          aria-invalid={status !== 'idle' && status !== 'checking'}
        />
        <button type="submit" className="pass-submit" disabled={status === 'checking'}>
          Use this code
        </button>
        <p id="pass-status" role="status" className="pass-status">
          {message}
        </p>
      </form>
      <p>{backLink}</p>
    </main>
  );
}
