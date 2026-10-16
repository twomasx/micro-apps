import type { Kind, RunStatus } from './protocol.ts';
import type { Aim } from './scoring.ts';

/** One of your runs, as the "Your runs" page shows it. */
export interface MeRun {
  runId: string;
  kind: Kind;
  aim: Aim;
  source: string;
  createdAt: string;
  lengthBits: number;
  n: number;
  deviation: number;
  z: number;
  status: RunStatus;
  hourEvent: string | null;
}

export interface MeAnswer {
  /** True with Lab Pass: every run, the lifetime total and the chart. */
  full: boolean;
  /** How many finished runs this device has, even when only the last few are listed. */
  totalRuns: number;
  /** Newest first. */
  runs: MeRun[];
  lifetime: { runs: number; combinedZ: number; bits: number } | null;
  chart: { bits: number[]; deviation: number[] } | null;
}
