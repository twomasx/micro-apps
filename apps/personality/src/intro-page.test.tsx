// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App.tsx';
import { preloadIntroState } from './lib/intro-state.ts';
import { addResult, removeResult } from './lib/store.ts';

const ID = 'abcdefghjkmnpqrs';

beforeEach(() => {
  vi.stubEnv('BASE_URL', '/personality/');
  window.history.pushState(null, '', '/personality/');
});

afterEach(async () => {
  cleanup();
  await removeResult(ID);
  vi.unstubAllEnvs();
});

describe('intro for a returning visitor', () => {
  it('draws the saved state on the first render when it was read before the app started', async () => {
    await addResult({ id: ID, version: 'p1', type: 'INTJ', deleteToken: 'secret', createdAt: '2026-10-12T00:00:00.000Z' });
    await preloadIntroState(null);
    // No waiting: the first render already has it.
    act(() => {
      render(<App />);
    });
    expect(screen.getByRole('link', { name: 'INTJ' }).getAttribute('href')).toBe(`/personality/r/${ID}/`);
  });

  it('reads the device again on a later visit to the intro', async () => {
    await preloadIntroState(null);
    act(() => {
      render(<App />);
    });
    cleanup();
    await addResult({ id: ID, version: 'p1', type: 'ENFP', deleteToken: 'secret', createdAt: '2026-10-12T00:00:00.000Z' });
    render(<App />);
    expect(screen.queryByText('Your last result:')).toBeNull();
    expect(await screen.findByRole('link', { name: 'ENFP' })).toBeTruthy();
  });
});
