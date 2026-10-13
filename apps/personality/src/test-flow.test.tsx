// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App.tsx';
import { currentQuestions as questions } from './lib/questions.ts';
import { score } from './lib/scoring.ts';
import { clearProgress, loadProgress, loadResults, removeResult } from './lib/store.ts';

const RESULT_ID = 'abcdefghjkmnpqrs';
const TOTAL = questions.items.length;

const fetchMock = vi.fn<typeof fetch>();

function respondWithResult(): void {
  fetchMock.mockImplementation(async (_input, init) => {
    const body = JSON.parse(String(init?.body)) as { version: string; answers: Record<string, number> };
    const result = score(questions, body.answers);
    return Response.json({ id: RESULT_ID, ...result, deleteToken: 'token' }, { status: 201 });
  });
}

async function openTest(): Promise<void> {
  window.history.pushState(null, '', '/personality/test');
  render(<App />);
  await screen.findByRole('status');
}

function progressText(): string {
  return screen.getByRole('status').textContent ?? '';
}

function choose(value: number): void {
  const option = questions.scale.find((entry) => entry.value === value);
  fireEvent.click(screen.getByLabelText(option?.label ?? ''));
}

function clickNext(): void {
  fireEvent.click(screen.getByRole('button', { name: /Next|See your result/ }));
}

async function answerQuestions(count: number, value = 4): Promise<void> {
  for (let done = 0; done < count; done += 1) {
    choose(value);
    clickNext();
  }
  // Let the last save reach IndexedDB.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function pressBrowserBack(): Promise<void> {
  await act(async () => {
    const popped = new Promise((resolve) =>
      window.addEventListener('popstate', resolve, { once: true }),
    );
    window.history.back();
    await popped;
  });
}

beforeEach(() => {
  // Vitest serves from '/', so set the base path the app is built with.
  vi.stubEnv('BASE_URL', '/personality/');
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  await clearProgress(questions.version);
  await removeResult(RESULT_ID);
});

describe('test flow', () => {
  it('starts on question 1 with the instructions', async () => {
    await openTest();
    expect(progressText()).toBe(`Question 1 of ${TOTAL}`);
    expect(screen.getByText(questions.instructions)).toBeTruthy();
    expect(screen.getByRole('group', { name: questions.items[0]?.text })).toBeTruthy();
    expect(screen.getAllByRole('radio')).toHaveLength(5);
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
  });

  it('does not go on without an answer', async () => {
    await openTest();
    clickNext();
    expect(progressText()).toBe(`Question 1 of ${TOTAL}`);
  });

  it('saves every answer and moves focus to the new question', async () => {
    await openTest();
    await answerQuestions(1, 2);
    expect(progressText()).toBe(`Question 2 of ${TOTAL}`);
    expect(document.activeElement?.textContent).toBe(questions.items[1]?.text);
    expect(await loadProgress(questions.version)).toMatchObject({
      version: 'p1',
      answers: { 'p1-01': 2 },
      index: 1,
    });
  });

  it('going back keeps answers and lets you change them', async () => {
    await openTest();
    await answerQuestions(2, 5);
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(progressText()).toBe(`Question 2 of ${TOTAL}`);
    expect((screen.getByLabelText('Very accurate') as HTMLInputElement).checked).toBe(true);

    choose(1);
    await answerQuestions(0);
    expect(await loadProgress(questions.version)).toMatchObject({
      answers: { 'p1-01': 5, 'p1-02': 1 },
    });
  });

  it('resumes on the same question after a reload', async () => {
    await openTest();
    await answerQuestions(3);
    cleanup();

    render(<App />);
    await waitFor(() => expect(progressText()).toBe(`Question 4 of ${TOTAL}`));
  });

  it('keys 1 to 5 answer the question', async () => {
    await openTest();
    fireEvent.keyDown(window, { key: '4' });
    const chosen = screen.getByLabelText('Moderately accurate') as HTMLInputElement;
    expect(chosen.checked).toBe(true);
    expect(document.activeElement).toBe(chosen);

    fireEvent.keyDown(window, { key: '7' });
    fireEvent.keyDown(window, { key: '2', ctrlKey: true });
    expect(chosen.checked).toBe(true);
  });

  it('the browser Back button goes to the previous question, not off the page', async () => {
    await openTest();
    await answerQuestions(2);
    expect(progressText()).toBe(`Question 3 of ${TOTAL}`);

    await pressBrowserBack();
    expect(progressText()).toBe(`Question 2 of ${TOTAL}`);
    expect(window.location.pathname).toBe('/personality/test');

    await pressBrowserBack();
    expect(progressText()).toBe(`Question 1 of ${TOTAL}`);
    expect(window.location.pathname).toBe('/personality/test');
  });

  it('submits all 40 answers, clears progress and opens the result', async () => {
    respondWithResult();
    await openTest();
    await answerQuestions(TOTAL - 1, 4);
    expect(progressText()).toBe(`Question ${TOTAL} of ${TOTAL}`);
    expect(fetchMock).not.toHaveBeenCalled();

    choose(4);
    fireEvent.click(screen.getByRole('button', { name: 'See your result' }));
    await waitFor(() => expect(window.location.pathname).toBe(`/personality/r/${RESULT_ID}`));

    const posts = fetchMock.mock.calls.filter(([, options]) => options?.method === 'POST');
    expect(posts).toHaveLength(1);
    const [url, init] = posts[0] ?? [];
    expect(url).toBe('/personality/api/results');
    expect(init?.method).toBe('POST');
    const sent = JSON.parse(String(init?.body)) as { version: string; answers: Record<string, number> };
    expect(sent.version).toBe('p1');
    expect(Object.keys(sent.answers)).toHaveLength(TOTAL);
    expect(new Set(Object.values(sent.answers))).toEqual(new Set([4]));

    expect(await loadProgress(questions.version)).toBeUndefined();
    expect(await loadResults()).toMatchObject([
      { id: RESULT_ID, version: 'p1', type: 'ESTJ', deleteToken: 'token' },
    ]);
  });

  it('keeps the answers and says so when sending fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('offline'));
    await openTest();
    await answerQuestions(TOTAL - 1);
    choose(4);
    fireEvent.click(screen.getByRole('button', { name: 'See your result' }));

    expect((await screen.findByRole('alert')).textContent).toContain('could not be sent');
    expect(window.location.pathname).toBe('/personality/test');
    const saved = (await loadProgress(questions.version)) as { answers: Record<string, number> };
    expect(Object.keys(saved.answers)).toHaveLength(TOTAL);

    respondWithResult();
    fireEvent.click(screen.getByRole('button', { name: 'See your result' }));
    await waitFor(() => expect(window.location.pathname).toBe(`/personality/r/${RESULT_ID}`));
  });
});

describe('intro', () => {
  it('offers to start, then to continue once there is progress', async () => {
    window.history.pushState(null, '', '/personality/');
    render(<App />);
    fireEvent.click(await screen.findByRole('link', { name: 'Start the test' }));
    await screen.findByRole('status');
    await answerQuestions(2);
    cleanup();

    window.history.pushState(null, '', '/personality/');
    render(<App />);
    expect(await screen.findByText(`You have answered 2 of ${TOTAL} questions.`)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Continue the test' })).toBeTruthy();
  });
});
