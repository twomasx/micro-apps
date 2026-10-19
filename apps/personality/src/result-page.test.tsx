// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App.tsx';
import type { PublicResult } from './lib/api.ts';
import { addResult, loadResults, removeResult } from './lib/store.ts';

const ID = 'abcdefghjkmnpqrs';

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
  summary: null,
  unlocked: false,
};

const fetchMock = vi.fn<typeof fetch>();
const writeText = vi.fn<(text: string) => Promise<void>>();

function respond(result: PublicResult = RESULT): void {
  fetchMock.mockImplementation(async (_input, init) =>
    init?.method === 'DELETE' ? new Response(null, { status: 204 }) : Response.json(result),
  );
}

async function saveAsOwn(): Promise<void> {
  await addResult({ id: ID, version: 'p1', type: 'INTJ', deleteToken: 'secret', createdAt: RESULT.createdAt });
}

function open(path: string): void {
  window.history.pushState(null, '', path);
  render(<App />);
}

beforeEach(() => {
  vi.stubEnv('BASE_URL', '/personality/');
  fetchMock.mockReset();
  writeText.mockReset();
  writeText.mockResolvedValue();
  vi.stubGlobal('fetch', fetchMock);
  // jsdom has no Web Share API, so sharing falls back to copying the link.
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});

afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  await removeResult(ID);
});

describe('result page', () => {
  it('shows the type, the four axes and the balanced label', async () => {
    respond();
    open(`/personality/r/${ID}`);

    expect(await screen.findByRole('heading', { level: 1, name: 'This type is INTJ' })).toBeTruthy();
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`/personality/api/results/${ID}`);
    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual([
      '68% Introversion',
      '53% Intuition',
      '80% Thinking',
      '60% Judging',
      'Full report',
    ]);
    expect(screen.getByText('balanced, leans N')).toBeTruthy();
    expect(screen.queryByText(/same answer/)).toBeNull();
    expect(document.title).toContain('Your result');
  });

  it('warns when every answer was the same', async () => {
    respond({ ...RESULT, flags: ['same_answers'] });
    open(`/personality/r/${ID}`);
    expect(
      await screen.findByText(
        'You gave the same answer to every question, so this result may not describe you.',
      ),
    ).toBeTruthy();
  });

  it('shares by copying the permanent link when the share sheet is missing', async () => {
    respond();
    open(`/personality/r/${ID}`);
    fireEvent.click(await screen.findByRole('button', { name: 'Share this result' }));

    expect((await screen.findByRole('status')).textContent).toBe('Link copied.');
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/personality/r/${ID}/`);
  });

  it('someone else\'s result offers the test, not compare or delete', async () => {
    respond();
    open(`/personality/r/${ID}`);
    expect(await screen.findByRole('link', { name: 'Take the test yourself' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Send a compare link' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete this result' })).toBeNull();
  });

  it('your own result makes a compare link and says who will see it', async () => {
    await saveAsOwn();
    respond();
    open(`/personality/r/${ID}`);

    expect(await screen.findByRole('heading', { level: 1, name: 'Your type is INTJ' })).toBeTruthy();
    expect(screen.getByText('The person you send this to will see your result.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Send a compare link' }));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/personality/?with=${ID}`),
    );
  });

  it('deletes your own result with its token', async () => {
    await saveAsOwn();
    respond();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    open(`/personality/r/${ID}`);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete this result' }));
    await waitFor(() => expect(window.location.pathname).toBe('/personality/'));

    const deleteCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'DELETE');
    expect(deleteCall?.[0]).toBe(`/personality/api/results/${ID}`);
    expect(deleteCall?.[1]?.headers).toEqual({ Authorization: 'Bearer secret' });
    expect(await loadResults()).toEqual([]);
  });

  it('treats a result the server no longer has as deleted', async () => {
    await saveAsOwn();
    fetchMock.mockImplementation(async (_input, init) =>
      init?.method === 'DELETE'
        ? Response.json({ error: 'not_found', message: 'No result with this id.' }, { status: 404 })
        : Response.json(RESULT),
    );
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    open(`/personality/r/${ID}`);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete this result' }));
    await waitFor(() => expect(window.location.pathname).toBe('/personality/'));
    expect(await loadResults()).toEqual([]);
  });

  it('does not delete when you cancel', async () => {
    await saveAsOwn();
    respond();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    open(`/personality/r/${ID}`);

    fireEvent.click(await screen.findByRole('button', { name: 'Delete this result' }));
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);
    expect(await loadResults()).toHaveLength(1);
  });

  it('says so when the result does not exist', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ error: 'not_found', message: 'No result with this id.' }, { status: 404 }),
    );
    open(`/personality/r/${ID}`);
    expect(await screen.findByRole('heading', { name: 'Result not found' })).toBeTruthy();
  });

  it('forgets a saved result the server no longer has', async () => {
    await saveAsOwn();
    fetchMock.mockResolvedValue(
      Response.json({ error: 'not_found', message: 'No result with this id.' }, { status: 404 }),
    );
    open(`/personality/r/${ID}`);
    expect(await screen.findByRole('heading', { name: 'Result not found' })).toBeTruthy();
    await waitFor(async () => expect(await loadResults()).toEqual([]));
  });

  it('offers a retry when loading fails', async () => {
    respond();
    fetchMock.mockRejectedValueOnce(new TypeError('offline'));
    open(`/personality/r/${ID}`);
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'This type is INTJ' })).toBeTruthy();
  });
});

describe('intro', () => {
  it('links to your last result', async () => {
    await saveAsOwn();
    open('/personality/');
    const link = await screen.findByRole('link', { name: 'INTJ' });
    expect(link.getAttribute('href')).toBe(`/personality/r/${ID}/`);
  });
});
