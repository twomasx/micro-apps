import { seoProblems } from '@micro/seo';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SAFETY_LINE } from '../lib/content';
import { GUIDES, guideTechnique, startPath } from '../lib/guides';
import { techniqueFromAddress } from '../hooks/useBreathScreen';
import { GUIDE_PAGES, PAGES } from '../seo';
import { GuidePage, stepText } from './GuidePage';
import { SciencePage } from './SciencePage';

/** The visible text of a page, with tags removed and entities decoded. */
function textOf(element: React.ReactElement): string {
  return renderToStaticMarkup(element)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .replace(/ ([.,)])/g, '$1');
}

describe('guide pages', () => {
  for (const guide of GUIDES) {
    const technique = guideTechnique(guide);
    const html = renderToStaticMarkup(<GuidePage slug={guide.slug} />);
    const text = textOf(<GuidePage slug={guide.slug} />);

    it(`${guide.slug}: 300 to 700 words, one H1, plain writing`, () => {
      const words = text.split(' ').filter((word) => /\w/.test(word)).length;
      expect(words).toBeGreaterThanOrEqual(300);
      expect(words).toBeLessThanOrEqual(700);
      expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
      expect(text).not.toMatch(/[—–!]/);
      expect(text.toLowerCase()).not.toMatch(/cures|treats|rewire|clinically proven|hack/);
    });

    it(`${guide.slug}: the answer and the start button come first, opening the timer on this technique`, () => {
      const h1 = html.indexOf('<h1');
      const start = html.indexOf(`href="${import.meta.env.BASE_URL}${startPath(guide)}"`);
      expect(start).toBeGreaterThan(h1);
      expect(start).toBeLessThan(html.indexOf('<h2'));
      expect(techniqueFromAddress(startPath(guide))).toBe(technique.id);
    });

    it(`${guide.slug}: the evidence, sources and safety line come from the app's own data`, () => {
      expect(text).toContain(technique.evidence!.label);
      expect(text).toContain(technique.evidence!.note);
      for (const source of technique.evidence!.sources) expect(text).toContain(source.finding);
      expect(text).toContain(SAFETY_LINE);
    });

    it(`${guide.slug}: a locked technique never sounds free`, () => {
      if (technique.free) expect(text).toContain('Free.');
      else {
        expect(text).toContain('lifetime unlock');
        expect(GUIDE_PAGES[guide.slug]!.title.toLowerCase()).not.toContain('free');
      }
    });
  }

  it('every page title and description fits, with no repeats across the app', () => {
    expect(seoProblems([...Object.values(PAGES), ...Object.values(GUIDE_PAGES)])).toEqual([]);
  });

  it('content pages carry Article and BreadcrumbList data', () => {
    for (const page of Object.values(GUIDE_PAGES)) {
      const types = (page.jsonLd ?? []).map((item) => (item as { '@type': string })['@type']);
      expect(types).toEqual(['Article', 'BreadcrumbList']);
      expect(page.type).toBe('article');
    }
  });

  it('describes each step from the technique data', () => {
    expect(stepText({ kind: 'in', ms: 4000, hint: 'Through your nose' }, undefined)).toBe(
      'Breathe in for 4 seconds, through your nose.',
    );
    expect(stepText({ kind: 'in', ms: 1000, hint: '' }, { kind: 'in' })).toBe('Breathe in again for 1 second.');
    expect(stepText({ kind: 'hold', ms: 4000, hint: 'Lungs full' }, undefined)).toBe('Hold for 4 seconds, lungs full.');
  });

  it('the science page links to every guide', () => {
    const science = renderToStaticMarkup(<SciencePage />);
    for (const guide of GUIDES) expect(science).toContain(`href="${import.meta.env.BASE_URL}${guide.slug}/"`);
  });

  it('ignores an unknown technique in the address', () => {
    expect(techniqueFromAddress('?t=nope')).toBeNull();
    expect(techniqueFromAddress('')).toBeNull();
  });
});
