/**
 * Browser helpers shared by every app. Import from '@micro/payments/client' so the bundle never pulls in Stripe.
 */
import type { PaymentsStatus } from './settings';

let status: Promise<PaymentsStatus | null> | null = null;

/**
 * GET api/payments, asked once per page load. Null when the server cannot be reached:
 * the buy button then stays as it is and checkout itself answers 503 if payments are closed.
 */
export function loadPaymentsStatus(baseUrl: string): Promise<PaymentsStatus | null> {
  status ??= fetch(`${baseUrl}api/payments`, { cache: 'no-store' })
    .then((response) => (response.ok ? (response.json() as Promise<PaymentsStatus>) : null))
    .catch(() => null);
  return status;
}

/** The words on a buy button while payments are closed. */
export const CLOSED_LABEL = 'Unlocks open soon';

/** True when checkout answered that payments are closed (the kill switch is off). */
export function isClosedResponse(status: number): boolean {
  return status === 503;
}
