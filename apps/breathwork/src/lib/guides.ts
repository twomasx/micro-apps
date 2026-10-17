/**
 * Guide pages: one page per technique, each answering one search ("box breathing timer"), with a start
 * button that opens the timer on that technique (SEO.md step 2). The evidence label, sources and safety
 * line come from techniques.json and content.ts, so a guide never says something the app doesn't.
 */
import { findTechnique, type Technique } from './techniques.ts';

export interface GuideQuestion {
  question: string;
  answer: string;
}

export interface Guide {
  /** The page's path under the base, without slashes: 'box-breathing'. */
  slug: string;
  techniqueId: string;
  /** The H1. */
  heading: string;
  /** One or two sentences that answer the search, under the H1. */
  answer: string;
  start: string;
  /** "How to do it": what to do before and after following the steps. */
  howTo: readonly string[];
  /** When people use the technique. */
  uses: readonly string[];
  /** What slow breathing research says beyond this technique's own sources. */
  research: readonly string[];
  /** Advice for this technique on top of the app's safety line. */
  careful: readonly string[];
  questions: readonly GuideQuestion[];
  /** Short name for links and breadcrumbs: 'Box breathing'. */
  name: string;
}

export const GUIDES: readonly Guide[] = [
  {
    slug: 'box-breathing',
    techniqueId: 'box',
    name: 'Box breathing',
    heading: 'Box breathing timer',
    answer:
      'Box breathing is four equal steps: breathe in for 4 seconds, hold for 4, breathe out for 4 and hold for 4. Press start and follow the dot around the square.',
    start: 'Start box breathing',
    howTo: [
      'Sit or lie down with your back straight and your shoulders loose. Breathe through your nose if you can.',
      'Start with 3 to 5 minutes. The timer has 1, 3 and 5 minute sessions. A soft tone marks each step, so you can close your eyes once you know the rhythm.',
      'If 4 seconds feels long, breathe more gently, not more deeply. Every step should feel easy.',
    ],
    uses: [
      'Box breathing is often used to steady yourself before something stressful, such as an exam, a talk or a hard conversation.',
      'It is easy to remember, it needs no equipment, and you can do it anywhere without anyone noticing.',
    ],
    research: [
      'Slow breathing in general has more research behind it than box breathing alone. A 2023 review of 12 trials with 785 adults found that people who practiced breathwork reported less stress than people in control groups. The effect was small to medium.',
    ],
    careful: [
      'The holds are what make box breathing harder than other patterns. If they feel like a strain, stop and breathe normally, or try the cyclic sigh, which has no holds.',
    ],
    questions: [
      {
        question: 'How long should I do box breathing?',
        answer:
          'In the 2023 study above, people practiced 5 minutes a day for 4 weeks. That is a good place to start. Longer is fine as long as it stays comfortable.',
      },
      {
        question: 'Is box breathing the same as square breathing?',
        answer: 'Yes. Box breathing, square breathing and 4-4-4-4 breathing are names for the same pattern.',
      },
      {
        question: 'Box breathing or 4-7-8?',
        answer:
          'Box breathing keeps every step the same length and is often used to stay steady and alert. 4-7-8 has a long hold and an even longer breath out, and is often used to wind down before sleep. Both are in the timer.',
      },
    ],
  },
];

export function findGuide(slug: string): Guide | undefined {
  return GUIDES.find((guide) => guide.slug === slug);
}

/** The technique a guide is about. Every guide names a technique that exists (checked by the tests). */
export function guideTechnique(guide: Guide): Technique {
  const technique = findTechnique(guide.techniqueId);
  if (!technique) throw new Error(`Guide ${guide.slug} names an unknown technique: ${guide.techniqueId}`);
  return technique;
}

/** The address that opens the timer on this technique: '?t=box'. */
export function startPath(guide: Guide): string {
  return `?t=${guide.techniqueId}`;
}
