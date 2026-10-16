import type { Kind } from './protocol.ts';

/** Combined numbers for a set of runs. Shared by the server and the global page. */
export interface Group {
  runs: number;
  /** Anonymous devices, not people we know anything about. */
  people: number;
  bits: number;
  /** Stouffer's method over the runs' scores. */
  combinedZ: number;
  abandoned: number;
  abandonedShare: number;
}

export interface GlobalAnswer {
  generatedAt: string;
  kind: 'all' | Kind;
  totals: Group;
  bySource: Record<string, Group>;
  byKind: Record<string, Group>;
  byWhen: Record<'hour' | 'anytime', Group>;
  /** Runs started but not yet finished. They count once they end. */
  inProgress: number;
  /** The running deviation toward each run's aim, over all bits ever. Starts at (0, 0). */
  chart: { bits: number[]; deviation: number[] };
}

export interface HourAnswer {
  generatedAt: string;
  all: Group;
  /** The most recent Intention Hours first. `key` is the event's date in Pacific time. */
  events: (Group & { key: string })[];
}
