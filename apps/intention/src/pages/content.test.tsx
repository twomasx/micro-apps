import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { runVerdict, totalVerdict } from '../lib/copy.ts';
import { chartVerdict } from '../lib/chart.ts';
import { DEFAULT_PAIR } from '../lib/pairs.ts';
import { tugText } from '../lib/tug-copy.ts';
import type { RunSnapshot } from '../lib/run-session.ts';
import { PrivacyPage } from './PrivacyPage.tsx';
import { SciencePage } from './SciencePage.tsx';

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');

const snapshot: RunSnapshot = { phase: 'idle', start: null, n: 0, deviation: 0, end: null, stoppedBy: null, saved: null, error: null };
const start = { runId: 'run0000000000001', aim: 'right' as const, lengthBits: 4000, source: 'crypto' as const, bitsPerSecond: 200 };

/** The tug screen's lines in every state, and the result wording at many scores. */
const appLines = [
  ...(['idle', 'starting', 'error'] as const).map((phase) => tugText({ ...snapshot, phase }, DEFAULT_PAIR, false).line),
  tugText({ ...snapshot, phase: 'running', start }, DEFAULT_PAIR, true).line,
  tugText({ ...snapshot, phase: 'stopped', start, stoppedBy: 'you' }, DEFAULT_PAIR, false).line,
  tugText({ ...snapshot, phase: 'stopped', start, stoppedBy: 'connection' }, DEFAULT_PAIR, false).line,
  ...[-3, -2, -0.5, 0, 0.5, 2, 3].map((z) => runVerdict(z, 'Glacier', 'Ember')),
  ...[-3, -1, 0, 1, 3].map((z) => totalVerdict(z, 100)),
  ...[0, 150, -220, 300].map((d) => chartVerdict(10_000, d)),
].join(' ');

const COPY = {
  science: text(renderToStaticMarkup(<SciencePage />)),
  privacy: text(renderToStaticMarkup(<PrivacyPage />)),
  app: appLines,
};

describe('copy', () => {
  it.each(Object.entries(COPY))('%s follows the writing rules: no em dashes, no exclamation marks', (_, copy) => {
    expect(copy).not.toMatch(/[—–!]/);
  });

  it.each(Object.entries(COPY))('%s makes none of the banned claims', (_, copy) => {
    const lower = copy.toLowerCase();
    for (const phrase of [
      'rewires',
      'syncs your brainwaves',
      'treats',
      'cures',
      'clinically proven',
      'scientifically accurate',
      'psychic powers',
      'manifestation',
      'controls reality',
      'proves that',
    ]) {
      expect(lower).not.toContain(phrase);
    }
  });

  it('never calls the random source quantum', () => {
    for (const copy of Object.values(COPY)) {
      const uses = copy.match(/[^.]*quantum[^.]*\./gi) ?? [];
      for (const sentence of uses) expect(sentence).toMatch(/not quantum/i);
    }
  });

  it('keeps the app stance and says the source truthfully', () => {
    expect(COPY.science).toContain('Nobody has proven it. Nobody has proven it impossible either.');
    expect(COPY.science).toContain('cryptographic random numbers generated on our server');
  });

  it('says chance odds with a number', () => {
    expect(COPY.science).toMatch(/about 1 time in \d+/);
    expect(COPY.science).toMatch(/1 run in 20/);
  });

  it('lists the three studies the app rests on', () => {
    expect(COPY.science).toContain('a review of a 12-year program');
    expect(COPY.science).toContain('PortREG replication experiments');
    expect(COPY.science).toContain('Psychological Bulletin');
  });
});
