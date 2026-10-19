import { formatCount, formatZ } from './copy.ts';
import type { MeRun } from './me-types.ts';
import { BITS_PER_SECOND, lengthBitsFor, STANDARD_SECONDS } from './protocol.ts';

/** "Oct 15, 9:03 pm" in the viewer's own time. */
export function runWhen(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  })
    .format(new Date(iso))
    .replace(/\s?(AM|PM)$/, (m) => ` ${m.trim().toLowerCase()}`);
}

/** One line under a run: its score and anything worth knowing about it. */
export function runDetails(run: MeRun): string {
  const parts = [`Score ${formatZ(run.z)}`, `Your color was on the ${run.aim}`];
  if (run.status === 'abandoned') {
    parts.push(`Stopped early after ${formatCount(run.n)} of ${formatCount(run.lengthBits)} bits`);
  } else if (run.lengthBits !== lengthBitsFor(STANDARD_SECONDS)) {
    parts.push(`${Math.round(run.lengthBits / BITS_PER_SECOND)} seconds`);
  }
  if (run.hourEvent) parts.push('Intention Hour');
  return `${parts.join('. ')}.`;
}
