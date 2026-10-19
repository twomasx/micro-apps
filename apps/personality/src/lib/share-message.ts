import type { ShareResult } from '@micro/platform';

/** What to tell you after a share: nothing when the share sheet handled it or you closed it. */
export function shareMessage(outcome: ShareResult): string | null {
  if (outcome === 'copied') return 'Link copied.';
  if (outcome === 'unavailable') return 'Sharing did not work. Copy the link from the address bar.';
  return null;
}
