import { isStagingHost } from '@micro/payments/client';
import type { CSSProperties } from 'react';

// Only staging shows this. Fixed to the top edge and click-through, so it never covers a control.
// Plain system colors until Roger styles it (see DESIGN-TODO.md).
const STYLE: CSSProperties = {
  position: 'fixed',
  top: 0,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 2147483647,
  margin: 0,
  padding: 'calc(env(safe-area-inset-top) + 2px) 8px 2px',
  font: '600 12px/1.4 system-ui, sans-serif',
  letterSpacing: '0.08em',
  background: 'Canvas',
  color: 'CanvasText',
  border: '1px solid CanvasText',
  borderTop: 0,
  pointerEvents: 'none',
};

/** "TEST MODE" on staging, where every purchase uses Stripe test cards. Never shown in production. */
export function TestModeLabel() {
  // Pages rendered at build time have no address; the label appears once the app starts on staging.
  if (typeof window === 'undefined' || !isStagingHost(window.location.hostname)) return null;
  return (
    <p className="test-mode-label" data-mode="test" role="note" style={STYLE}>
      TEST MODE
    </p>
  );
}
