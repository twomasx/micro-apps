// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App.tsx';
import type { PublicResult } from './lib/api.ts';
import { leaveTo } from './lib/navigation.ts';
import type { Report } from './lib/report.ts';

// Leaving for Stripe would navigate the test page away, so only record it.
vi.mock('./lib/navigation.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./lib/navigation.ts')>()),
  leaveTo: vi.fn(),
}));

const ID = 'abcdefghjkmnpqrs';
const CHECKOUT_URL = 'https://checkout.stripe.com/c/pay/cs_test_1';

const RESULT: PublicResult = {
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

const REPORT: Report = {
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

const fetchMock = vi.fn<typeof fetch>();
/** What the report endpoint answers, in order. The last one repeats. */
let reportAnswers: (Report | 402 | 'revoked')[];
/** What the result endpoint says: null means the result does not exist. */
let result: PublicResult | null;

function reportResponse(): Response {
  const answer = reportAnswers.length > 1 ? reportAnswers.shift() : reportAnswers[0];
  if (answer === 402) {
    return Response.json({ error: 'payment_required', message: 'Not unlocked.' }, { status: 402 });
  }
  if (answer === 'revoked') {
    return Response.json({ error: 'payment_revoked', message: 'Refunded or disputed.' }, { status: 402 });
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
    expect(screen.getByText('$9.99 once. No renewals.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Unlock the full report' })).toBeTruthy();
    expect(screen.queryByText(/could not confirm/)).toBeNull();
    expect(screen.queryByText('Strengths text.')).toBeNull();
    // A locked report is not requested, so the browser logs no failed request.
    expect(calls('/report')).toEqual([]);
    expect(document.title).toContain('Full report');
  });

  it('starts checkout on the server and goes to the URL it returns', async () => {
    open(`/personality/r/${ID}/report`);
    fireEvent.click(await screen.findByRole('button', { name: 'Unlock the full report' }));

    await waitFor(() => expect(leaveTo).toHaveBeenCalledWith(CHECKOUT_URL));
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(post?.[0]).toBe('/personality/api/checkout');
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({ product: 'report', resultId: ID });
  });

  it('wakes the button again when Back from Stripe shows the page as it was left', async () => {
    open(`/personality/r/${ID}/report`);
    const button = await screen.findByRole('button', { name: 'Unlock the full report' });
    fireEvent.click(button);
    await waitFor(() => expect(leaveTo).toHaveBeenCalledWith(CHECKOUT_URL));
    expect((button as HTMLButtonElement).disabled).toBe(true);

    window.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: true }));
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
  });

  it('says so when checkout cannot be started', async () => {
    open(`/personality/r/${ID}/report`);
    const button = await screen.findByRole('button', { name: 'Unlock the full report' });
    fetchMock.mockImplementation(async () => new Response(null, { status: 500 }));
    fireEvent.click(button);

    expect((await screen.findByRole('alert')).textContent).toBe('Checkout could not be started. Try again.');
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
    expect(screen.queryByRole('button', { name: 'Unlock the full report' })).toBeNull();

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

  it('sends the checkout session to the server, then drops it from the URL', async () => {
    reportAnswers = [REPORT];
    open(`/personality/r/${ID}/report?session_id=cs_test_1`);

    expect(await screen.findByText('Strengths text.')).toBeTruthy();
    expect(calls('/report')).toEqual([`/personality/api/results/${ID}/report?session_id=cs_test_1`]);
    await waitFor(() => expect(window.location.search).toBe(''));
    expect(window.location.pathname).toBe(`/personality/r/${ID}/report/`);
  });

  it('offers to check again when the payment is not confirmed yet', async () => {
    reportAnswers = [402, REPORT];
    open(`/personality/r/${ID}/report?session_id=cs_test_1`);

    expect((await screen.findByRole('status')).textContent).toContain('could not confirm a payment');
    fireEvent.click(screen.getByRole('button', { name: 'Check again' }));
    expect(await screen.findByText('Strengths text.')).toBeTruthy();
  });

  it('says when the payment it came back from was refunded or disputed', async () => {
    reportAnswers = ['revoked'];
    open(`/personality/r/${ID}/report?session_id=cs_test_1`);

    expect((await screen.findByRole('status')).textContent).toContain('refunded or disputed');
    expect(screen.queryByText(/could not confirm/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Check again' })).toBeNull();
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

  it('shows no price once the report is unlocked', async () => {
    result = { ...RESULT, unlocked: true };
    open(`/personality/r/${ID}`);
    expect(await screen.findByRole('link', { name: 'Read the full report' })).toBeTruthy();
    expect(screen.queryByText(/once\. No renewals/)).toBeNull();
  });
});
