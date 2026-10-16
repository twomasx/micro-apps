import type { ExperimentId } from '../content.ts';
import { attentionSpecimen } from './attention.ts';
import { breathworkSpecimen } from './breathwork.ts';
import { focusSpecimen } from './focus.ts';
import { intentionSpecimen } from './intention.ts';
import { personalitySpecimen } from './personality.ts';

/** One drawing per app, as inline SVG markup. */
export const specimens: Record<ExperimentId, () => string> = {
  personality: personalitySpecimen,
  focus: focusSpecimen,
  breathwork: breathworkSpecimen,
  attention: attentionSpecimen,
  intention: intentionSpecimen,
};
