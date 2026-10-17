import { PASS_MESSAGES, type UseCodeResult } from '@micro/payments/pass';
import { useEffect, useState, type FormEvent } from 'react';
import { AppLinks } from '../components/AppLinks';
import { Link } from '../components/Link';
import { CONTACT_LINE } from '../lib/copy';
import { pass } from '../lib/pass-state';

type Status = 'idle' | 'checking' | UseCodeResult;

export function RestorePage() {
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

  const code = pass.code();
  if (status === 'active' && code) {
    return (
      <main className="restore" data-state="active">
        <section className="pass-hero" aria-labelledby="restore-title">
          <div className="pass-hero-text">
            <p className="eyebrow">Code accepted</p>
            <h1 className="pass-title" id="restore-title">
              Your pass is on this device
            </h1>
            <p role="status" className="pass-lead">
              Open any app below and it is already unlocked.
            </p>
          </div>
        </section>
        <AppLinks code={code} />
      </main>
    );
  }

  const message =
    status === 'idle'
      ? ''
      : status === 'checking'
        ? 'Checking your code.'
        : status === 'active'
          ? 'Your pass is on this device.'
          : PASS_MESSAGES[status];
  return (
    <main className="restore" data-state={status}>
      <section className="pass-hero" aria-labelledby="restore-title">
        <div className="pass-hero-text">
          <p className="eyebrow">Already bought</p>
          <h1 className="pass-title" id="restore-title">
            Enter your pass code
          </h1>
          <p className="pass-lead">Enter the code you saved after buying the pass. It puts the pass on this device.</p>
        </div>
        <form className="code-form" onSubmit={submit} noValidate>
          <label className="code-label" htmlFor="code">
            Pass code
          </label>
          <input
            id="code"
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
            aria-describedby="code-status"
            aria-invalid={status !== 'idle' && status !== 'checking'}
          />
          <button type="submit" className="code-submit" disabled={status === 'checking'}>
            {status === 'checking' ? 'Checking' : 'Use this code'}
          </button>
          <p id="code-status" role="status" className="code-status">
            {message}
          </p>
          <p className="pass-note">{CONTACT_LINE}</p>
          <p className="pass-note">
            No pass yet? <Link to="">See the pass</Link>
          </p>
        </form>
      </section>
    </main>
  );
}
