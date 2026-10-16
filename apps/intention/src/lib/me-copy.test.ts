import { describe, expect, it } from 'vitest';
import type { MeRun } from './me-types.ts';
import { runDetails, runWhen } from './me-copy.ts';

const run: MeRun = {
  runId: 'run0000000000001',
  kind: 'tug',
  aim: 'right',
  source: 'crypto',
  createdAt: '2026-10-16T04:03:00.000Z',
  lengthBits: 4000,
  n: 4000,
  deviation: 40,
  z: 0.632,
  status: 'complete',
  hourEvent: null,
};

describe('your runs, in words', () => {
  it('dates a run in your own time', () => {
    expect(runWhen(run.createdAt, 'America/Los_Angeles')).toBe('Oct 15, 9:03 pm');
    expect(runWhen(run.createdAt, 'Europe/London')).toBe('Oct 16, 5:03 am');
  });

  it('gives the score and what is special about the run', () => {
    expect(runDetails(run)).toBe('Score +0.63. Your color was on the right.');
    expect(runDetails({ ...run, status: 'abandoned', n: 650, hourEvent: '2026-10-15' })).toBe(
      'Score +0.63. Your color was on the right. Stopped early after 650 of 4,000 bits. Intention Hour.',
    );
    expect(runDetails({ ...run, lengthBits: 12_000, n: 12_000, aim: 'left' })).toBe(
      'Score +0.63. Your color was on the left. 60 seconds.',
    );
  });
});
