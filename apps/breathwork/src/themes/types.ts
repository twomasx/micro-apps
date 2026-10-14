import type { ComponentType } from 'react';
import type { BreathController } from '../lib/breath-controller';

/**
 * A theme draws the breath and nothing else. It reads frames from the controller (technique,
 * phase, progress through the phase, lung level from 0 to 1, session status) and never
 * changes the session. The breathing screen around it (words, count, buttons) is shared.
 *
 * Pattern draws each technique as a shape with a dot tracing it. A second theme (Tide: the
 * screen fills with water as you breathe in) can be added as another BreathTheme, drawing
 * `frame.breath.lungLevel` as a water level.
 */
export type StageMoment =
  /** Follows the breath. */
  | 'live'
  /** First visit: the shape draws itself once while the technique is explained. */
  | 'intro'
  /** A session has just finished. */
  | 'complete';

export interface StageProps {
  controller: Pick<BreathController, 'frame' | 'onFrame'>;
  moment: StageMoment;
  reducedMotion: boolean;
}

export interface BreathTheme {
  id: string;
  name: string;
  /** Fills the stage area of the breathing screen. */
  Stage: ComponentType<StageProps>;
}
