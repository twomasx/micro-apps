import { formatCount } from './copy.ts';
import type { Group } from './totals-types.ts';

/** Plain labels for the global page. */

export const SOURCE_LABELS: Record<string, string> = {
  crypto: 'Cryptographic random numbers made on our server',
};

export const KIND_LABELS: Record<string, string> = {
  tug: 'Two colors',
};

export const WHEN_LABELS: Record<'hour' | 'anytime', string> = {
  hour: 'During Intention Hour',
  anytime: 'Any other time',
};

export function percent(share: number): string {
  if (share > 0 && share < 0.01) return 'under 1%';
  return `${Math.round(share * 100)}%`;
}

/** "3 runs by 2 people" with the right plurals. */
export function runsByPeople(group: Pick<Group, 'runs' | 'people'>): string {
  return `${formatCount(group.runs)} ${group.runs === 1 ? 'run' : 'runs'} by ${formatCount(group.people)} ${
    group.people === 1 ? 'person' : 'people'
  }`;
}

export function abandonedLine(group: Group): string {
  if (group.runs === 0) return '';
  if (group.abandoned === 0) return 'No run was stopped early.';
  return `${percent(group.abandonedShare)} of runs were stopped early (${formatCount(group.abandoned)}). They still count.`;
}

/** An event key like "2026-10-15" as "Oct 15". */
export function eventDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}
