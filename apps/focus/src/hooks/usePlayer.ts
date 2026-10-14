import { useSyncExternalStore } from 'react';
import { getPlayer } from '../lib/app-player';
import type { PlayerAction, PlayerState } from '../lib/player';

export function usePlayer(): [PlayerState, (action: PlayerAction) => void] {
  const player = getPlayer();
  const state = useSyncExternalStore(player.subscribe, player.getState);
  return [state, player.dispatch];
}
