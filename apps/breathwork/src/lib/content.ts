import type { EvidenceLabel, Technique } from './techniques.ts';

/** How long finished sessions are kept on this device. Said on the privacy page; the history code deletes older ones. */
export const HISTORY_DAYS = 365;

/** The safety line from the spec. Shown on the first-run screen and the science page. */
export const SAFETY_LINE =
  "Breathe gently. If you feel dizzy or lightheaded, stop and breathe normally. Don't practice breath holds while driving, in water, or anywhere fainting would be dangerous. If you are pregnant or have a heart or lung condition, check with a doctor first.";

/** How to read a shape, in one line. First-run screen and science page. */
export const HOW_TO_FOLLOW =
  'The dot goes up while you breathe in, across while you hold, and down while you breathe out. Each side shows its seconds.';

/** Plain meaning of each evidence label. The same three labels as the focus app. */
export const LABEL_MEANINGS: { label: EvidenceLabel; text: string }[] = [
  { label: 'Some research', text: 'Several studies point the same way.' },
  { label: 'Mixed results', text: 'Studies found different things, some for and some against.' },
  { label: 'Little research', text: 'Few studies, or none that tested this exact pattern.' },
];

/** "2 s in, 1 s in again, 6 s out", in the order you breathe. */
export function patternText(technique: Pick<Technique, 'phases'>): string {
  return technique.phases
    .map((phase, i) => {
      const seconds = `${Math.round(phase.ms / 100) / 10} s`;
      const previous = technique.phases[i - 1];
      if (phase.kind === 'in') return `${seconds} in${previous?.kind === 'in' ? ' again' : ''}`;
      if (phase.kind === 'out') return `${seconds} out`;
      return `${seconds} hold`;
    })
    .join(', ');
}
