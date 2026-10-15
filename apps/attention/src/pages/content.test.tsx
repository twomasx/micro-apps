import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PrivacyPage } from './PrivacyPage';
import { SciencePage } from './SciencePage';

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&quot;/g, '"');

const PAGES = { science: text(renderToStaticMarkup(<SciencePage />)), privacy: text(renderToStaticMarkup(<PrivacyPage />)) };

describe('page copy', () => {
  it.each(Object.entries(PAGES))('%s follows the writing rules: no em dashes, no exclamation marks', (_, copy) => {
    // A source's title is quoted exactly, so the 1997 paper's "Oops!" is the one exception.
    expect(copy.replace('"Oops!"', '')).not.toMatch(/[—–!]/);
  });

  it.each(Object.entries(PAGES))('%s makes none of the banned claims', (_, copy) => {
    for (const phrase of ['rewires', 'syncs your brainwaves', 'clinically proven', 'scientifically accurate', 'cures', 'boosts IQ']) {
      expect(copy.toLowerCase()).not.toContain(phrase.toLowerCase());
    }
    // "treat" appears only in the required disclaimer.
    expect(copy.match(/treat/gi)?.length ?? 0).toBeLessThanOrEqual(1);
  });

  it('carries the allowed study claim and the disclaimer, word for word', () => {
    expect(PAGES.science).toContain(
      'In a controlled study, 6 weeks of training like this improved sustained attention and working memory in adults aged 18 to 35.',
    );
    expect(PAGES.science).toContain('This is not a medical device or a treatment for ADHD or any condition.');
  });

  it('says chance odds with a number', () => {
    expect(PAGES.science).toMatch(/about 1 time in \d+/);
  });

  it('lists its sources with links', () => {
    expect(PAGES.science).toContain('doi.org/10.1038/s41562-019-0611-9');
    expect(PAGES.science).toContain('doi.org/10.1016/S0028-3932(97)00015-8');
  });
});
