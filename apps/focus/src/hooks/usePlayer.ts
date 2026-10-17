import { useSyncExternalStore } from 'react';
import { getPlayer } from '../lib/app-player';
import { createPlayerState, type PlayerAction, type PlayerState } from '../lib/player';

/**
 * The player as the page rendered at build time sees it: a first visit, before the saved settings are read.
 * The app's own first render is the same, so the page does not change when the app takes over.
 */
const SERVER_STATE: PlayerState = createPlayerState(0);
const serverPlayer = {
  subscribe: () => () => {},
  getState: () => SERVER_STATE,
  dispatch: () => {},
};

export function usePlayer(): [PlayerState, (action: PlayerAction) => void] {
  // No sound, storage or network at build time: the real player starts in the browser.
  const player = typeof window === 'undefined' ? serverPlayer : getPlayer();
  const state = useSyncExternalStore(player.subscribe, player.getState, () => SERVER_STATE);
  return [state, player.dispatch];
}
