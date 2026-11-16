// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App.tsx';
import type { PublicResult, TypeReport } from './lib/api.ts';
import type { BigFiveReport, BigFiveResultResponse } from './lib/big-five-view.ts';
import { saveUnlock, loadUnlockBack } from './lib/store.ts';
import { leaveTo } from './lib/navigation.ts';

// Leaving for Stripe would navigate the test page away, so only record it.
vi.mock('./lib/navigation.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./lib/navigation.ts')>()),
  leaveTo: vi.fn(),
}));

const ID = 'abcdefghjkmnpqrs';
const CHECKOUT_URL = 'https://checkout.stripe.com/c/pay/cs_test_1';

const RESULT: PublicResult = {
  kind: 'type',
  id: ID,
  version: 'p1',
  type: 'INTJ',
  scores: [
    { axis: 'EI', letter: 'I', leftPct: 32.5, rightPct: 67.5, balanced: false },
    { axis: 'SN', letter: 'N', leftPct: 47.5, rightPct: 52.5, balanced: true },
    { axis: 'TF', letter: 'T', leftPct: 80, rightPct: 20, balanced: false },
    { axis: 'JP', letter: 'J', leftPct: 60, rightPct: 40, balanced: false },
  ],
  flags: [],
  createdAt: '2026-10-12T00:00:00.000Z',
  summary: 'A short summary.',
  unlocked: false,
};

const REPORT: TypeReport = {
  kind: 'type',
  id: ID,
  type: 'INTJ',
  version: 'p1',
  createdAt: '2026-10-12T12:00:00.000Z',
  questionCount: 40,
  summary: 'A short summary.',
  axes: [
    {
      axis: 'SN',
      title: 'Sensing and Intuition',
      letter: 'N',
      headline: '53% Intuition',
      balanceLabel: 'balanced, leans N',
      rightPct: 52.5,
      itemCount: 10,
      left: { letter: 'S', name: 'Sensing', pct: 47, winner: false },
      right: { letter: 'N', name: 'Intuition', pct: 53, winner: true },
      blocks: [
        { heading: 'Your result', body: 'First paragraph.\n\nSecond paragraph.' },
        { heading: 'Near the middle', body: 'Middle text.' },
      ],
    },
  ],
  traits: [{ axis: 'SN', trait: 'Openness to experience', pct: 52.5 }],
  sections: [{ heading: 'Strengths', body: 'Strengths text.' }],
};

const BIG_FIVE: BigFiveResultResponse = {
  kind: 'big-five',
  id: ID,
  version: 'b1',
  traits: [
    { trait: 'O', name: 'Openness to experience', pct: 72.5, band: 'higher', measures: 'O measures.', summary: 'O summary.' },
    { trait: 'N', name: 'Neuroticism', pct: 31.25, band: 'lower', measures: 'N measures.', summary: 'N summary.' },
  ],
  flags: [],
  createdAt: '2026-11-15T00:00:00.000Z',
  unlocked: false,
};

const BIG_FIVE_REPORT: BigFiveReport = {
  kind: 'big-five',
  id: ID,
  version: 'b1',
  createdAt: '2026-11-15T12:00:00.000Z',
  questionCount: 100,
  traits: BIG_FIVE.traits.map((trait) => ({
    ...trait,
    depth: `${trait.trait} depth first.\n\n${trait.trait} depth second.`,
    aspects: [
      { aspect: `${trait.trait}1`, name: `${trait.trait} aspect one`, pct: 80, band: 'higher', measures: 'm', text: `${trait.trait} one text.` },
      { aspect: `${trait.trait}2`, name: `${trait.trait} aspect two`, pct: 20, band: 'lower', measures: 'm', text: `${trait.trait} two text.` },
    ],
  })),
};

const fetchMock = vi.fn<typeof fetch>();
/** What the report endpoint answers, in order. The last one repeats. */
let reportAnswers: (TypeReport | BigFiveReport | 402)[];
/** What the result endpoint says: null means the result does not exist. */
let result: PublicResult | null;

function reportResponse(): Response {
  const answer = reportAnswers.length > 1 ? reportAnswers.shift() : reportAnswers[0];
  if (answer === 402) {
    return Response.json({ error: 'payment_required', message: 'Not unlocked.' }, { status: 402 });
  }
  return Response.json(answer);
}

function calls(fragment: string): string[] {
  return fetchMock.mock.calls.map(([input]) => String(input)).filter((url) => url.includes(fragment));
}

function open(path: string): void {
  window.history.pushState(null, '', path);
  render(<App />);
}

beforeEach(() => {
  vi.stubEnv('BASE_URL', '/personality/');
  reportAnswers = [402];
  result = RESULT;
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (input, init) => {
    const url = String(input);
    if (url.includes('/report')) return reportResponse();
    if (init?.method === 'POST') return Response.json({ url: CHECKOUT_URL }, { status: 201 });
    if (!result) return Response.json({ error: 'not_found', message: 'No result.' }, { status: 404 });
    return Response.json(result);
  });
  vi.stubGlobal('fetch', fetchMock);
  vi.mocked(leaveTo).mockReset();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('report page', () => {
  it('shows the offer with a one-time price when the report is locked', async () => {
    open(`/personality/r/${ID}/report`);

    expect(await screen.findByRole('heading', { level: 1, name: 'Full report INTJ' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: 'Unlock everything in Personality' })).toBeTruthy();
    expect(screen.getByText('$9.99 once. No renewals.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Unlock everything' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Enter your code' }).getAttribute('href')).toBe(
      `/personality/restore/?back=r%2F${ID}%2Freport`,
    );
    expect(screen.queryByText('Strengths text.')).toBeNull();
    // A locked report is not requested, so the browser logs no failed request.
    expect(calls('/report')).toEqual([]);
    expect(document.title).toContain('Full report');
  });

  it('starts checkout for the lifetime unlock and remembers this report to come back to', async () => {
    open(`/personality/r/${ID}/report`);
    fireEvent.click(await screen.findByRole('button', { name: 'Unlock everything' }));

    await waitFor(() => expect(leaveTo).toHaveBeenCalledWith(CHECKOUT_URL));
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(post?.[0]).toBe('/personality/api/checkout');
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({ product: 'lifetime' });
    expect(await loadUnlockBack()).toBe(`r/${ID}/report`);
  });

  it('wakes the button again when Back from Stripe shows the page as it was left', async () => {
    open(`/personality/r/${ID}/report`);
    const button = await screen.findByRole('button', { name: 'Unlock everything' });
    fireEvent.click(button);
    await waitFor(() => expect(leaveTo).toHaveBeenCalledWith(CHECKOUT_URL));
    expect((button as HTMLButtonElement).disabled).toBe(true);

    window.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: true }));
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
  });

  it('says so when checkout cannot be started', async () => {
    open(`/personality/r/${ID}/report`);
    const button = await screen.findByRole('button', { name: 'Unlock everything' });
    fetchMock.mockImplementation(async () => new Response(null, { status: 500 }));
    fireEvent.click(button);

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Checkout could not be started. Check your connection and try again.',
    );
    expect(leaveTo).not.toHaveBeenCalled();
  });

  it('shows the report when the server says it is unlocked', async () => {
    result = { ...RESULT, unlocked: true };
    reportAnswers = [REPORT];
    open(`/personality/r/${ID}/report`);

    expect(await screen.findByRole('heading', { level: 2, name: '02 The four scales' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 3, name: '53% Intuition' })).toBeTruthy();
    expect(screen.getByText('(balanced, leans N)')).toBeTruthy();
    expect(screen.getByText('First paragraph.')).toBeTruthy();
    expect(screen.getByText('Second paragraph.')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: '04 INTJ in depth' })).toBeTruthy();
    expect(screen.getByText('Strengths text.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Unlock everything' })).toBeNull();

    // The graphics: the profile panel, a ruler with all 41 positions, and the trait bar.
    expect(screen.getByRole('img', { name: 'Profile: 53% Intuition.' })).toBeTruthy();
    expect(document.querySelectorAll('.ruler-tick')).toHaveLength(41);
    const ruler = document.querySelector<HTMLElement>('.ruler');
    expect(ruler?.style.getPropertyValue('--pos')).toBe('52.5');
    const trait = document.querySelector<HTMLElement>('.trait');
    expect(trait?.textContent).toContain('Openness to experience 53%');
    expect(trait?.style.getPropertyValue('--pct')).toBe('52.5');

    // The contents list links to each numbered part.
    const contents = screen.getByRole('navigation', { name: 'Contents' });
    expect(Array.from(contents.querySelectorAll('a'), (link) => link.getAttribute('href'))).toEqual([
      '#profile',
      '#scales',
      '#traits',
      '#depth',
      '#method',
    ]);
    for (const id of ['profile', 'scales', 'traits', 'depth', 'method']) {
      expect(document.getElementById(id)).toBeTruthy();
    }
    expect(screen.getByText('2.5 points')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Print or save as PDF' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Back to the result' }).getAttribute('href')).toBe(
      `/personality/r/${ID}/`,
    );
  });

  it("sends this device's unlock code and device id with its requests", async () => {
    await saveUnlock({ code: '7K3M-Q9TD-2XWB-HC4R', valid: true, checkedAt: 1 });
    result = { ...RESULT, unlocked: true };
    reportAnswers = [REPORT];
    open(`/personality/r/${ID}/report`);

    expect(await screen.findByText('Strengths text.')).toBeTruthy();
    const [, init] = fetchMock.mock.calls.find(([input]) => String(input).includes('/report'))!;
    const headers = init?.headers as Record<string, string>;
    expect(headers['X-Unlock-Code']).toBe('7K3M-Q9TD-2XWB-HC4R');
    expect(headers['X-Device-Id']).toMatch(/^[a-z0-9]{12,64}$/);
  });

  it('a locked Big Five report offers the same unlock', async () => {
    result = BIG_FIVE;
    open(`/personality/r/${ID}/report`);
    expect(await screen.findByRole('heading', { level: 1, name: 'Full Big Five report' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Unlock everything' })).toBeTruthy();
    expect(calls('/report')).toEqual([]);
  });

  it('shows the Big Five report: each trait in depth with both aspects', async () => {
    result = { ...BIG_FIVE, unlocked: true };
    reportAnswers = [BIG_FIVE_REPORT];
    open(`/personality/r/${ID}/report`);

    expect(await screen.findByRole('heading', { level: 2, name: '01 Openness to experience' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: '02 Neuroticism' })).toBeTruthy();
    expect(screen.getByText('O depth first.')).toBeTruthy();
    expect(screen.getByText('O depth second.')).toBeTruthy();
    expect(screen.getByText('O one text.')).toBeTruthy();
    expect(screen.getByText('N two text.')).toBeTruthy();
    expect(screen.getByText('Toward the higher end')).toBeTruthy();
    expect(document.querySelectorAll('.big-five-aspect')).toHaveLength(4);
    expect(document.getElementById('method')).toBeTruthy();
  });

  it('says when the result does not exist', async () => {
    result = null;
    open(`/personality/r/${ID}/report`);
    expect(await screen.findByRole('heading', { level: 1, name: 'Result not found' })).toBeTruthy();
  });
});

describe('result page', () => {
  it('links to the report with its price while it is locked', async () => {
    open(`/personality/r/${ID}`);
    const link = await screen.findByRole('link', { name: 'See the full report' });
    expect(link.getAttribute('href')).toBe(`/personality/r/${ID}/report/`);
    expect(screen.getByText('$9.99 once. No renewals.')).toBeTruthy();
    expect(screen.getByText('A short summary.')).toBeTruthy();
  });

  it('shows a Big Five result: five traits with scores, bands and text', async () => {
    result = BIG_FIVE;
    open(`/personality/r/${ID}`);
    expect(await screen.findByRole('heading', { level: 1, name: 'This result Big Five' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: 'Openness to experience 73' })).toBeTruthy();
    expect(screen.getByText('O summary.')).toBeTruthy();
    expect(screen.getByText('Toward the lower end')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'See the full report' }).getAttribute('href')).toBe(`/personality/r/${ID}/report/`);
    expect(screen.getByRole('link', { name: 'Take the test yourself' }).getAttribute('href')).toBe('/personality/big-five/');
  });

  it('shows no price once the report is unlocked', async () => {
    result = { ...RESULT, unlocked: true };
    open(`/personality/r/${ID}`);
    expect(await screen.findByRole('link', { name: 'Read the full report' })).toBeTruthy();
    expect(screen.queryByText(/once\. No renewals/)).toBeNull();
  });
});
