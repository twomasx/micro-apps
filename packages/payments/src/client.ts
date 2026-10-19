/**
 * Browser helpers shared by every app. Import from '@micro/payments/client' so the bundle never pulls in Stripe.
 */
import type { PaymentsStatus } from './settings';

const statuses = new Map<string, Promise<PaymentsStatus | null>>();

/**
 * GET api/payments, asked once per page load. Null when the server cannot be reached:
 * the buy button then stays as it is and checkout itself answers 503 if payments are closed.
 */
export function loadPaymentsStatus(baseUrl: string, fetcher: typeof fetch = fetch): Promise<PaymentsStatus | null> {
  let status = statuses.get(baseUrl);
  if (!status) {
    status = fetcher(`${baseUrl}api/payments`, { cache: 'no-store' })
      .then((response) => (response.ok ? (response.json() as Promise<PaymentsStatus>) : null))
      .catch(() => null);
    statuses.set(baseUrl, status);
  }
  return status;
}

/** The words on a buy button while payments are closed. */
export const CLOSED_LABEL = 'Unlocks open soon';

/** True when checkout answered that payments are closed (the kill switch is off). */
export function isClosedResponse(status: number): boolean {
  return status === 503;
}

/**
 * True on a staging address: staging.polymadlabs.com, staging.<project>.pages.dev, or later
 * staging.<an app's own domain>. Production hostnames never start with "staging.", so the
 * TEST MODE label can never show there, and no request is needed to decide.
 */
export function isStagingHost(hostname: string): boolean {
  return hostname.startsWith('staging.');
}

/**
 * Once the code from a checkout is saved on this device, the checkout id leaves the address bar, so a shared or
 * bookmarked link cannot show the code to anyone else. The page on screen stays as it is. `path` also changes the
 * page a reload opens (the pass's thanks page becomes its home page, which shows the saved pass).
 */
export function forgetCheckoutInAddress(path?: string, win: Pick<Window, 'location' | 'history'> = window): void {
  const url = new URL(win.location.href);
  if (!url.searchParams.has('session_id')) return;
  url.searchParams.delete('session_id');
  win.history.replaceState(win.history.state, '', `${path ?? url.pathname}${url.search}${url.hash}`);
}
