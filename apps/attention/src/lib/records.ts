import type { SartScore, SartLength } from './sart-score';

/** One tick probe inside a stretch. Experimental: never changes the stretch length. */
export interface ProbeRecord {
  /** When the tick played, in seconds from the start of the stretch. */
  atSeconds: number;
  /** A tap came after the tick, before the stretch ended. */
  heard: boolean;
  /** Taps before the tick played. Not a notice, kept so summaries stay honest. */
  earlyTaps: number;
}

export interface StretchRecord {
  seconds: number;
  stayed: boolean;
  probe: ProbeRecord | null;
}

/** A training session, kept on this device only. */
export interface SessionRecord {
  id: string;
  /** Epoch ms. */
  startedAt: number;
  /** Local calendar date, YYYY-MM-DD. Practice days are counted from these. */
  date: string;
  targetSeconds: number;
  stretches: StretchRecord[];
  /** The stretch length the next session starts at. */
  nextSeconds: number;
  /** Reached its focus-time target. A session left early still counts its stretches. */
  finished: boolean;
}

/** A finished attention test. Per-digit data is kept with it on this device. */
export interface TestRecord {
  id: string;
  takenAt: number;
  date: string;
  length: SartLength;
  /** 1 for the first test of this length on this device. */
  nth: number;
  /** Practice days finished when the test was taken. Weekly prompts compare against this. */
  afterPracticeDays: number;
  score: SartScore;
}
