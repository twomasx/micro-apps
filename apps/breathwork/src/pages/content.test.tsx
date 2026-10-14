import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { IntroCard } from '../components/IntroCard';
import { HISTORY_DAYS, LABEL_MEANINGS, patternText, SAFETY_LINE } from '../lib/content';
import { findTechnique, techniques } from '../lib/techniques';
import { PrivacyPage } from './PrivacyPage';
import { SciencePage } from './SciencePage';

/** The visible text of a component, with tags removed and entities decoded. */
function textOf(element: React.ReactElement): string {
  return renderToStaticMarkup(element)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .replace(/ ([.,)])/g, '$1')
    .replace(/\( /g, '(');
}

const science = textOf(<SciencePage />);
const privacy = textOf(<PrivacyPage />);
const intro = textOf(<IntroCard onStart={() => {}} />);

describe('science page', () => {
  it('lists every technique with its pattern, label, wording, note and every source finding', () => {
    for (const technique of techniques) {
      expect(science).toContain(technique.name);
      expect(science).toContain(patternText(technique));
      expect(science).toContain(technique.wording);
      expect(science).toContain(technique.evidence!.label);
      expect(science).toContain(technique.evidence!.note);
      for (const source of technique.evidence!.sources) {
        expect(science).toContain(source.finding);
        expect(science).toContain(`${source.authors}, ${source.year}`);
      }
    }
  });

  it('explains every label', () => {
    for (const { label, text } of LABEL_MEANINGS) {
      expect(science).toContain(label);
      expect(science).toContain(text);
    }
  });

  it('gives the meta-analysis result with its size and its limits', () => {
    expect(science).toContain('A 2023 meta-analysis of 12 randomized trials with 785 adults');
    expect(science).toContain('The effect was small to medium (g = 0.35).');
    expect(science).toContain('less stress than about 64% of people who did not');
    expect(science).toContain('moderate risk of bias');
  });
});

describe('patternText', () => {
  it('reads each pattern in the order you breathe', () => {
    expect(patternText(findTechnique('sigh')!)).toBe('2 s in, 1 s in again, 6 s out');
    expect(patternText(findTechnique('box')!)).toBe('4 s in, 4 s hold, 4 s out, 4 s hold');
    expect(patternText(findTechnique('resonant')!)).toBe('5.5 s in, 5.5 s out');
  });
});

describe('safety and privacy', () => {
  it('shows the safety line on the first-run screen and the science page', () => {
    expect(intro).toContain(SAFETY_LINE);
    expect(science).toContain(SAFETY_LINE);
  });

  it('says what is stored, where, and for how long', () => {
    expect(privacy).toContain('On this device');
    expect(privacy).toContain('On our server');
    expect(privacy).toContain(`Sessions older than ${HISTORY_DAYS} days are deleted.`);
    expect(privacy).toContain('until you clear this site');
    expect(privacy).toContain('for as long as Breathwork is online');
    expect(privacy).toContain('We do not copy your email');
  });
});

describe('wording', () => {
  it('has no banned claims, no em dashes and no exclamation marks', () => {
    for (const text of [science, privacy, intro]) {
      for (const banned of [
        /rewire/i,
        /sync(s|ed)? your brain/i,
        /\bhacks?\b/i,
        /clinically proven/i,
        /scientifically accurate/i,
        /\bcures?\b/i,
        /\btreats?\b/i,
        /—/,
        /!/,
      ]) {
        expect(text).not.toMatch(banned);
      }
    }
  });
});
