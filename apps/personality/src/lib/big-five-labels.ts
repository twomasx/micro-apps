// Words for Big Five scores, shared by the result, report and compare screens. No DOM, so tests import it.
import type { Band } from './big-five-test.ts';

export const BAND_LABEL: Readonly<Record<Band, string>> = {
  lower: 'Toward the lower end',
  middle: 'Near the middle',
  higher: 'Toward the higher end',
};

export const ASPECT_BAND_LABEL: Readonly<Record<'lower' | 'higher', string>> = {
  lower: 'Lower half',
  higher: 'Higher half',
};

/** Said wherever Big Five scores are shown. There are no norms yet, so nothing is compared with other people. */
export const SCALE_NOTE =
  'Each score shows where your answers sat on that scale, from 0 to 100. It is not a comparison with other people.';
