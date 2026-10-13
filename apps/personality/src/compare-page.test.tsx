// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App.tsx';
import { compareScores, type CompareResponse } from './lib/compare.ts';
import { leaveTo } from './lib/navigation.ts';
import { currentQuestions } from './lib/questions.ts';
import type { AxisScore } from './lib/scoring.ts';
import { addResult, clearCompareWith, loadCompareWith, removeResult } from './lib/store.ts';

// Leaving for Stripe would navigate the test page away, so only record it.
vi.mock('./lib/navigation.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./lib/navigation.ts')>()),
  leaveTo: vi.fn(),
}));

const A = 'aaaaaaaaaaaaaaaa';
const B = 'bbbbbbbbbbbbbbbb';
const CHECKOUT_URL = 'https://checkout.stripe.com/c/pay/cs_test_1';

function scores(rights: number[]): AxisScore[] {
  return currentQuestions.axes.map((axis, position) => {
    const rightPct = rights[position] ?? 50;
    return {
      axis: axis.id,
      letter: rightPct > 50 ? axis.right.letter : axis.left.letter,
      leftPct: 100 - rightPct,
      rightPct,
      balanced: Math.abs(rightPct - 50) <= 5,
    };
  });
}

const COMPARE: CompareResponse = {
  // A is INTJ, B is ISFP: alike on E/I only.
  ...compareScores(scores([75, 60, 20, 40]), scores([55, 30, 80, 90]), currentQuestions),
  a: { id: A, type: 'INTJ', reportUnlocked: false },
  b: { id: B, type: 'ISFP', reportUnlocked: false },
  unlocked: false,
  couple: null,
};

const UNLOCKED: CompareResponse = {
  ...COMPARE,
  unlocked: true,
  couple: [
    {
      axis: 'EI',
      title: 'Extraversion and Introversion, together',
      heading: 'Both I',
      body: 'You both lean toward quiet.',
      questions: ['First question?', 'Second question?'],
    },
  ],
};

const fetchMock = vi.fn<typeof fetch>();
/** What the compare endpoint answers, in order. The last one repeats. */
let answers: (CompareResponse | 404)[];

function open(path: string): void {
  window.history.pushState(null, '', path);
  render(<App />);
}

async function saveAsOwn(id: string, type: string): Promise<void> {
  await addResult({ id, version: 'p1', type, deleteToken: 'secret', createdAt: '2026-10-12T00:00:00.000Z' });
}

function axisRow(name: string): HTMLElement {
  const row = screen.getByRole('heading', { level: 2, name }).closest('li');
  if (!row) throw new Error(`No row for ${name}`);
  return row;
}

beforeEach(() => {
  vi.stubEnv('BASE_URL', '/personality/');
  answers = [COMPARE];
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (_input, init) => {
    if (init?.method === 'POST') return Response.json({ url: CHECKOUT_URL }, { status: 201 });
    const answer = answers.length > 1 ? answers.shift() : answers[0];
    if (answer === 404 || answer === undefined) {
      return Response.json({ error: 'not_found', message: 'No result.' }, { status: 404 });
    }
    return Response.json(answer);
  });
  vi.stubGlobal('fetch', fetchMock);
  vi.mocked(leaveTo).mockReset();
});

afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  await removeResult(A);
  await removeResult(B);
  await clearCompareWith();
});

describe('compare page', () => {
  it('shows both results on each scale and says alike or different', async () => {
    open(`/personality/c/${A}/${B}`);

    expect(await screen.findByRole('heading', { level: 1, name: 'Comparison INTJ and ISFP' })).toBeTruthy();
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`/personality/api/compare/${A}/${B}`);

    const energy = axisRow('Extraversion and Introversion');
    expect(energy.dataset.alike).toBe('true');
    expect(within(energy).getByText('Alike')).toBeTruthy();
    expect(within(energy).getByText('First: 75% Introversion')).toBeTruthy();
    expect(within(energy).getByText('Second: 55% Introversion')).toBeTruthy();

    const decisions = axisRow('Thinking and Feeling');
    expect(within(decisions).getByText('Different')).toBeTruthy();
    expect(within(decisions).getByText('First: 80% Thinking')).toBeTruthy();
    expect(within(decisions).getByText('Second: 80% Feeling')).toBeTruthy();
    const scale = decisions.querySelector<HTMLElement>('.pair-scale');
    expect(scale?.style.getPropertyValue('--a')).toBe('20');
    expect(scale?.style.getPropertyValue('--b')).toBe('80');
    expect(scale?.style.getPropertyValue('--gap')).toBe('60');
    expect(document.title).toContain('Comparison');
  });

  it('labels the one number honestly and never calls it compatibility or a match', async () => {
    open(`/personality/c/${A}/${B}`);

    // Gaps of 20, 30, 60 and 50 average 40.
    expect(await screen.findByText('60%')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: 'How similar your answers are' })).toBeTruthy();
    expect(screen.getByText(/predicts relationship satisfaction only weakly/)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/compatib|match/i);
  });

  it('offers the couple report with a one-time price and starts checkout for the pair', async () => {
    open(`/personality/c/${A}/${B}`);
    expect(await screen.findByText('$7.99 once. No renewals.')).toBeTruthy();
    // Neither result is yours, so there is no offer that includes "your" full report.
    expect(screen.queryByRole('button', { name: 'Unlock it with your full report' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Unlock the couple report' }));
    await waitFor(() => expect(leaveTo).toHaveBeenCalledWith(CHECKOUT_URL));
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(post?.[0]).toBe('/personality/api/checkout');
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({
      product: 'couple',
      resultId: A,
      partnerResultId: B,
    });
  });

  it('puts your own result first and offers both reports for it', async () => {
    await saveAsOwn(B, 'ISFP');
    open(`/personality/c/${A}/${B}`);

    expect(await screen.findByRole('heading', { level: 1, name: 'Comparison ISFP and INTJ' })).toBeTruthy();
    const decisions = axisRow('Thinking and Feeling');
    expect(within(decisions).getByText('You: 80% Feeling')).toBeTruthy();
    expect(within(decisions).getByText('Them: 80% Thinking')).toBeTruthy();
    expect(screen.getByText('$14.99 once. No renewals.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Unlock it with your full report' }));
    await waitFor(() => expect(leaveTo).toHaveBeenCalled());
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    // Your own result is the one that gets the full report.
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({
      product: 'both',
      resultId: B,
      partnerResultId: A,
    });
  });

  it('does not offer both when your full report is already unlocked', async () => {
    await saveAsOwn(A, 'INTJ');
    answers = [{ ...COMPARE, a: { ...COMPARE.a, reportUnlocked: true } }];
    open(`/personality/c/${A}/${B}`);

    expect(await screen.findByRole('button', { name: 'Unlock the couple report' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Unlock it with your full report' })).toBeNull();
  });

  it('shows the couple report once the server says it is unlocked', async () => {
    answers = [UNLOCKED];
    open(`/personality/c/${A}/${B}`);

    expect(
      await screen.findByRole('heading', { level: 3, name: 'Both I Extraversion and Introversion, together' }),
    ).toBeTruthy();
    expect(screen.getByText('You both lean toward quiet.')).toBeTruthy();
    expect(screen.getByText('First question?')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Unlock the couple report' })).toBeNull();
    expect(screen.queryByText(/once\. No renewals/)).toBeNull();
  });

  it('sends the checkout session to the server, then drops it from the URL', async () => {
    answers = [UNLOCKED];
    open(`/personality/c/${A}/${B}?session_id=cs_test_1`);

    expect(await screen.findByText('You both lean toward quiet.')).toBeTruthy();
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`/personality/api/compare/${A}/${B}?session_id=cs_test_1`);
    await waitFor(() => expect(window.location.search).toBe(''));
  });

  it('offers to check again when the payment is not confirmed yet', async () => {
    answers = [COMPARE, UNLOCKED];
    open(`/personality/c/${A}/${B}?session_id=cs_test_1`);

    expect((await screen.findByRole('status')).textContent).toContain('could not confirm a payment');
    fireEvent.click(screen.getByRole('button', { name: 'Check again' }));
    expect(await screen.findByText('You both lean toward quiet.')).toBeTruthy();
  });

  it('says when one of the results does not exist', async () => {
    answers = [404];
    open(`/personality/c/${A}/${B}`);
    expect(await screen.findByRole('heading', { level: 1, name: 'Comparison not found' })).toBeTruthy();
  });
});

describe('compare link on the intro', () => {
  it('explains the link and remembers who to compare with', async () => {
    open(`/personality/?with=${A}`);

    expect(await screen.findByRole('heading', { level: 2, name: 'Someone wants to compare' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Start the test' })).toBeTruthy();
    expect(await loadCompareWith()).toBe(A);
  });

  it('offers your last result so you do not have to retake the test', async () => {
    await saveAsOwn(B, 'ISFP');
    open(`/personality/?with=${A}`);

    const link = await screen.findByRole('link', { name: 'Compare using your last result, ISFP' });
    expect(link.getAttribute('href')).toBe(`/personality/c/${A}/${B}`);
  });

  it('says so when the link is your own', async () => {
    await saveAsOwn(A, 'INTJ');
    open(`/personality/?with=${A}`);

    expect(await screen.findByText(/This is your own compare link/)).toBeTruthy();
    expect(screen.queryByRole('heading', { level: 2, name: 'Someone wants to compare' })).toBeNull();
    expect(await loadCompareWith()).toBeNull();
  });

  it('ignores a link that is not a result id', async () => {
    open('/personality/?with=<script>');
    expect(await screen.findByRole('link', { name: 'Start the test' })).toBeTruthy();
    expect(screen.queryByRole('heading', { level: 2, name: 'Someone wants to compare' })).toBeNull();
    expect(await loadCompareWith()).toBeNull();
  });
});

describe('science and privacy pages', () => {
  it('shows the science page with its sources', async () => {
    open('/personality/science');
    expect(await screen.findByRole('heading', { level: 1, name: 'The science' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: 'Sources' })).toBeTruthy();
    expect(screen.getByText(/It is not a clinical tool/)).toBeTruthy();
    expect(document.title).toContain('The science');
  });

  it('shows the privacy note', async () => {
    open('/personality/privacy');
    expect(await screen.findByRole('heading', { level: 1, name: 'Privacy' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: 'How to delete your result' })).toBeTruthy();
  });

  it('is linked from the footer of every page', async () => {
    open('/personality/');
    const footer = await screen.findByRole('navigation', { name: 'About this test' });
    expect(within(footer).getByRole('link', { name: 'The science' }).getAttribute('href')).toBe(
      '/personality/science',
    );
    expect(within(footer).getByRole('link', { name: 'Privacy' }).getAttribute('href')).toBe(
      '/personality/privacy',
    );
  });
});
