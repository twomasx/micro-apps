import { describe, expect, it } from 'vitest';
import type { ReportAxis } from './report.ts';
import { formatReportDate, profilePoints, reportParts, rulerTicks, stepSize } from './report-view.ts';

describe('rulerTicks', () => {
  it('has one tick for each of the 41 positions of a 10-question scale', () => {
    const ticks = rulerTicks(10);
    expect(ticks).toHaveLength(41);
    expect(ticks[0]).toEqual({ pct: 0, size: 'major' });
    expect(ticks[1]).toEqual({ pct: 2.5, size: 'minor' });
    expect(ticks[20]).toEqual({ pct: 50, size: 'center' });
    expect(ticks[40]).toEqual({ pct: 100, size: 'major' });
    expect(ticks.filter((tick) => tick.size === 'major').map((tick) => tick.pct)).toEqual([0, 25, 75, 100]);
  });

  it('matches the step size', () => {
    expect(stepSize(10)).toBe(2.5);
  });
});

describe('profilePoints', () => {
  it('puts each marker in the middle of its row', () => {
    const axes = [{ rightPct: 67.5 }, { rightPct: 52.5 }, { rightPct: 20 }] as ReportAxis[];
    expect(profilePoints(axes)).toBe('67.5,0.5 52.5,1.5 20,2.5');
  });
});

describe('formatReportDate', () => {
  it('writes the date in plain words', () => {
    expect(formatReportDate('2026-10-12T20:40:00.000Z', 'UTC')).toBe('Oct 12, 2026');
  });

  it('returns nothing for a date it cannot read', () => {
    expect(formatReportDate('not a date')).toBe('');
  });
});

describe('reportParts', () => {
  it('numbers the parts and names the type', () => {
    expect(reportParts('INTJ').map((part) => `${part.number} ${part.title}`)).toEqual([
      '01 Profile',
      '02 The four scales',
      '03 The Big Five traits',
      '04 INTJ in depth',
      '05 How this was measured',
    ]);
  });
});
