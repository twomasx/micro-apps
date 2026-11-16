import { useState } from 'react';
import { SAVE_CODE_LINE } from '../lib/unlock.ts';

/** The unlock code with a copy button and the line that tells the buyer to keep it. */
export function CodeCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(code).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  };
  return (
    <div className="code-card">
      <p className="code-card-label">Your unlock code</p>
      <p className="code-card-code" translate="no">
        {code}
      </p>
      <p className="code-card-note">{SAVE_CODE_LINE}</p>
      <button type="button" className="code-card-copy" onClick={copy} data-state={copied ? 'copied' : 'idle'}>
        {copied ? 'Copied' : 'Copy the code'}
      </button>
    </div>
  );
}
