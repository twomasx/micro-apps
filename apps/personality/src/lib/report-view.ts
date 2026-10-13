import type { ReportAxis } from './report.ts';

/** The winning side must be this close to 50% for a scale to count as balanced. */
export const BALANCED_HALF_WIDTH = 5;

export interface RulerTick {
  /** Position from the left end, 0 to 100. */
  pct: number;
  size: 'minor' | 'major' | 'center';
}

/**
 * One tick for every position a scale can land on. Each question has 5 answers,
 * so a scale of 10 questions has 41 positions, 2.5 points apart.
 */
export function rulerTicks(itemCount: number): RulerTick[] {
  const steps = itemCount * 4;
  return Array.from({ length: steps + 1 }, (_, step) => {
    const pct = (step / steps) * 100;
    const size = pct === 50 ? 'center' : pct % 25 === 0 ? 'major' : 'minor';
    return { pct, size };
  });
}

/** How far one answer changed by one step moves a scale, in percentage points. */
export function stepSize(itemCount: number): number {
  return 100 / (itemCount * 4);
}

/** SVG points for the line that joins the four markers, one row per scale. */
export function profilePoints(axes: readonly ReportAxis[]): string {
  return axes.map((axis, row) => `${axis.rightPct},${row + 0.5}`).join(' ');
}

/** "Oct 12, 2026" */
export function formatReportDate(iso: string, timeZone?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone }).format(date);
}

export interface ReportPart {
  id: string;
  /** "01" */
  number: string;
  title: string;
}

/** The numbered parts of the report, in order. The contents list and the headings both use it. */
export function reportParts(type: string): ReportPart[] {
  const titles: [string, string][] = [
    ['profile', 'Profile'],
    ['scales', 'The four scales'],
    ['traits', 'The Big Five traits'],
    ['depth', `${type} in depth`],
    ['method', 'How this was measured'],
  ];
  return titles.map(([id, title], position) => ({
    id,
    number: String(position + 1).padStart(2, '0'),
    title,
  }));
}
