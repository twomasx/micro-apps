import type { TestRecord } from './records';

export type NormsAnswer =
  | { length: 'quick' | 'full'; version: number; ready: false; count: number }
  | { length: 'quick' | 'full'; version: number; ready: true; count: number; scores: number[] };

/**
 * The share of first results here below this score, counting ties as half, as a whole percent.
 * Null when the table is not ready or is for another score version.
 */
export function percentileFor(norms: NormsAnswer | null, score: number, version: number): number | null {
  if (!norms || !norms.ready || norms.version !== version || norms.count === 0) return null;
  let below = 0;
  for (let s = 0; s < score && s < norms.scores.length; s++) below += norms.scores[s] ?? 0;
  const equal = norms.scores[score] ?? 0;
  return Math.round(((below + equal / 2) / norms.count) * 100);
}

/** What the server is sent after a test: no name, no device id, no per-digit data. */
export function summaryOf(record: TestRecord) {
  const s = record.score;
  return {
    version: s.version,
    length: record.length,
    nth: record.nth,
    commissions: s.commissions,
    omissions: s.omissions,
    anticipations: s.anticipations,
    meanRt: s.meanRt,
    sdRt: s.sdRt,
    cv: s.cv,
    score: s.score,
  };
}
