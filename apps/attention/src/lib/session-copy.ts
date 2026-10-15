import { clock } from './format';
import type { SessionState } from './session';

/** The instructions shown before the first session. Wording from the spec. */
export const FIRST_SESSION_STEPS = [
  'Sit comfortably.',
  'Close your eyes.',
  'Rest your attention on the feeling of your breath.',
  'When you notice your mind has wandered, that is normal.',
  'Answer honestly when the bell rings.',
] as const;

export const PROBE_NOTE =
  'Now and then a very quiet tick plays. If you hear it, tap anywhere on the screen. This part is experimental.';

/** The one line of text under the circle, for each moment of a session. */
export function sessionMessage(state: SessionState): { line: string; hint: string | null } {
  const last = state.stretches.at(-1);
  switch (state.phase) {
    case 'ready':
      return { line: `First stretch ${clock(state.nextSeconds)}.`, hint: 'Close your eyes after the tok.' };
    case 'stretch':
      return { line: 'Eyes closed. Stay with your breath.', hint: null };
    case 'ask':
      return { line: 'Did you stay with your breath the whole time?', hint: null };
    case 'rest':
      return {
        line: last?.stayed
          ? `Held ${clock(last.seconds)}. The next one is a little longer.`
          : 'That is normal. The next one is a little shorter.',
        hint: 'Close your eyes. The tok starts the next stretch.',
      };
    case 'paused':
      return {
        line: 'Paused. You left the app, so the stretch you were in did not count.',
        hint: 'Continue when you are settled again.',
      };
    case 'done':
      return { line: '', hint: null };
  }
}
