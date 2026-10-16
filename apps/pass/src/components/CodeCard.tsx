import { formatPassCode } from '@micro/payments/pass-codes';
import { useState } from 'react';
import { SAVE_CODE_LINE } from '../lib/copy';

/** The pass code with a copy button and the line that tells the buyer to keep it. */
export function CodeCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const shown = formatPassCode(code.replace(/-/g, ''));
  const copy = () => {
    navigator.clipboard?.writeText(shown).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  };
  return (
    <section className="code-card" aria-labelledby="code-title">
      <h2 id="code-title" className="code-title">
        Your pass code
      </h2>
      <p className="code" translate="no">
        {shown}
      </p>
      <p className="code-note">{SAVE_CODE_LINE}</p>
      <button type="button" className="code-copy" onClick={copy} data-state={copied ? 'copied' : 'idle'}>
        {copied ? 'Copied' : 'Copy the code'}
      </button>
    </section>
  );
}
