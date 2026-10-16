import { formatZ, runVerdict } from './copy.ts';
import { colorsFor, type ColorPair } from './pairs.ts';
import { BITS_PER_SECOND } from './protocol.ts';
import type { RunSnapshot } from './run-session.ts';
import { liveZ, runZ } from './scoring.ts';
import { arrowFor } from './tug.ts';

/** Everything the tug screen says, worked out from the run. The page only lays it out. */
export interface TugText {
  /** Shown before a run and briefly as it starts, then faded out. */
  headline: string;
  headlineVisible: boolean;
  /** "Your color: Glacier ←". Hidden before a run. */
  pill: { name: string; hex: string; arrow: string } | null;
  /** The big score, or null before a run. */
  score: string | null;
  line: string;
  button: 'Begin' | 'Pull again' | 'Try again' | 'Stop';
}

export const SCORE_CAPTION = 'how far from chance';

const ERROR_LINES: Record<string, string> = {
  network: 'The run could not start. Check your connection and try again.',
};

/**
 * @param holdHeadline true for the first moments of a run, so the headline can name your color
 *   before it fades out.
 */
export function tugText(snapshot: RunSnapshot, pair: ColorPair, holdHeadline: boolean): TugText {
  const { phase, start, n, deviation, end, saved, stoppedBy } = snapshot;
  const colors = start ? colorsFor(pair, start.aim) : null;
  const headline = colors ? `Pull ${colors.mine.name} across` : 'Pull your color across';
  const pill = start && colors ? { name: colors.mine.name, hex: colors.mine.hex, arrow: arrowFor(start.aim) } : null;

  switch (phase) {
    case 'idle':
    case 'starting':
      return {
        headline,
        headlineVisible: true,
        pill: null,
        score: null,
        line:
          phase === 'idle'
            ? 'You get one of the two colors at random. For 20 seconds, try to make it spread across the screen.'
            : 'Starting your run.',
        button: phase === 'idle' ? 'Begin' : 'Stop',
      };
    case 'running':
      return {
        headline,
        headlineVisible: holdHeadline,
        pill,
        score: formatZ(liveZ(deviation, start!.aim, n)),
        line: `Hold ${colors!.mine.name} in mind and will it across.`,
        button: 'Stop',
      };
    case 'done':
      return {
        headline,
        headlineVisible: false,
        pill,
        score: formatZ(end!.z),
        line: runVerdict(end!.z, colors!.mine.name, colors!.other.name),
        button: 'Pull again',
      };
    case 'stopped': {
      const seconds = start ? Math.round(start.lengthBits / BITS_PER_SECOND) : 0;
      const z = saved ? saved.z : start ? runZ(deviation, start.aim, start.lengthBits) : 0;
      return {
        headline,
        headlineVisible: false,
        pill,
        score: start ? formatZ(z) : null,
        line:
          stoppedBy === 'connection'
            ? 'The connection dropped. This run still counts, with the bits it had.'
            : `You stopped early. This run still counts, scored over its full ${seconds} seconds.`,
        button: 'Pull again',
      };
    }
    case 'error':
      return {
        headline,
        headlineVisible: true,
        pill: null,
        score: null,
        line: ERROR_LINES[snapshot.error ?? 'network'] ?? ERROR_LINES.network!,
        button: 'Try again',
      };
  }
}
