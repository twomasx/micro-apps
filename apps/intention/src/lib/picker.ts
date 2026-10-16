import type { Rgb } from './color.ts';
import { hardToTellApart, pairDistances, DISTINCT } from './colorblind.ts';

export interface PairCheck {
  level: 'ok' | 'caution';
  notes: string[];
}

/**
 * Plain notes about a custom pair. Nothing is blocked: the screen stays readable on any colors, and the
 * pill always names your color, but a pair that is hard to tell apart makes a poor tug of war.
 */
export function pairCheck(left: Rgb, right: Rgb): PairCheck {
  const distances = pairDistances(left, right);
  if (distances.typical < DISTINCT) {
    return { level: 'caution', notes: ['These two colors are hard to tell apart. Pick two that differ more.'] };
  }
  if (hardToTellApart(left, right).length > 0) {
    return {
      level: 'caution',
      notes: [
        'People with red-green color blindness may find these two hard to tell apart. A difference in lightness helps.',
      ],
    };
  }
  return { level: 'ok', notes: [] };
}
