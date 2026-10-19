import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { IntroSheet } from '../components/PlayerSheets';
import { HEADPHONES_LINE, SAFETY_LINE } from '../lib/player-view';
import { presets } from '../lib/presets';
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
const intro = textOf(<IntroSheet onStart={() => {}} onClose={() => {}} />);

describe('page content', () => {
  it('says what the meta-analysis found, in the words of the spec', () => {
    expect(science).toContain(
      'A 2019 meta-analysis of 22 studies (Garcia-Argibay, Santed and Reales, Psychological Research) found a medium effect (g = 0.45) on memory, attention, anxiety and pain perception. Listening before a task worked better than during it, and longer exposure worked better. Results vary a lot between studies, and the idea that a beat makes your brain match its frequency is not well supported.',
    );
  });

  it('lists every preset with its label and sources on the science page', () => {
    for (const preset of presets) {
      expect(preset.evidence).not.toBeNull();
      expect(science).toContain(preset.name);
      expect(science).toContain(preset.evidence);
      for (const source of preset.sources) expect(science).toContain(source.finding);
    }
  });

  it('shows the safety line on the science page and the first-run screen', () => {
    expect(science).toContain(SAFETY_LINE);
    expect(intro).toContain(SAFETY_LINE);
    expect(intro).toContain(HEADPHONES_LINE);
  });

  it('keeps a space between words and the links inside them', () => {
    // textOf() turns tags into spaces, so a missing space before a link only shows in the markup.
    expect(renderToStaticMarkup(<PrivacyPage />)).toContain('The <a href="https://polymadlabs.com/pass/privacy/">');
  });

  it('keeps the wording honest: no banned claims, no em dashes, no exclamation marks', () => {
    for (const text of [science, privacy, intro]) {
      for (const banned of [
        /rewire/i,
        /sync(s|ed)? your brain/i,
        /puts? your brain in/i,
        /boosts? IQ/i,
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
