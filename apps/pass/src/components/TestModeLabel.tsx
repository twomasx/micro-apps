import { isStagingHost } from '@micro/payments/client';

/**
 * "TEST MODE" on staging, where every purchase uses Stripe test cards. Never shown in production.
 * Fixed to the top edge and click-through (styles.css), so it never covers a control.
 */
export function TestModeLabel() {
  if (typeof window === 'undefined' || !isStagingHost(window.location.hostname)) return null;
  return (
    <p className="test-mode-label" data-mode="test" role="note">
      TEST MODE
    </p>
  );
}
