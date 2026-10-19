import { formatZ, runVerdict } from './copy.ts';
import { colorsFor, type ColorPair } from './pairs.ts';
import { priceLine } from './products.ts';
import { BITS_PER_SECOND, FREE_RUNS_PER_DAY, STANDARD_SECONDS } from './protocol.ts';
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
  button: 'Begin' | 'Pull again' | 'Try again' | 'Stop' | 'See Lab Pass';
}

export const SCORE_CAPTION = 'how far from chance';

const ERROR_LINES: Record<string, string> = {
  network: 'The run could not start. Check your connection and try again.',
  daily_limit: `You have used your ${FREE_RUNS_PER_DAY} free runs for today. Lab Pass gives unlimited runs: ${priceLine()}`,
  lab_pass_required: `Longer runs come with Lab Pass: ${priceLine()}`,
};

/** Errors that Lab Pass answers. The button goes to the Lab Pass page instead of trying again. */
const LAB_PASS_ERRORS = new Set(['daily_limit', 'lab_pass_required']);

/**
 * @param holdHeadline true for the first moments of a run, so the headline can name your color
 *   before it fades out.
 * @param seconds the length the next run will be.
 */
export function tugText(
  snapshot: RunSnapshot,
  pair: ColorPair,
  holdHeadline: boolean,
  seconds: number = STANDARD_SECONDS,
): TugText {
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
            ? `You get one of the two colors at random. For ${seconds} seconds, try to make it spread across the screen.`
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
      const runSeconds = start ? Math.round(start.lengthBits / BITS_PER_SECOND) : 0;
      const z = saved ? saved.z : start ? runZ(deviation, start.aim, start.lengthBits) : 0;
      return {
        headline,
        headlineVisible: false,
        pill,
        score: start ? formatZ(z) : null,
        line: !start
          ? // Stopped while the run was still starting: no bits, no color, nothing to score on screen.
            'You stopped before any bits arrived.'
          : stoppedBy === 'connection'
            ? 'The connection dropped. This run still counts, with the bits it had.'
            : `You stopped early. This run still counts, scored over its full ${runSeconds} seconds.`,
        button: 'Pull again',
      };
    }
    case 'error': {
      const code = snapshot.error ?? 'network';
      return {
        headline,
        headlineVisible: true,
        pill: null,
        score: null,
        line: ERROR_LINES[code] ?? ERROR_LINES.network!,
        button: LAB_PASS_ERRORS.has(code) ? 'See Lab Pass' : 'Try again',
      };
    }
  }
}
