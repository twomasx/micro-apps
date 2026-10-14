import { createAudioEngine, type OutputRoute } from './audio';
import { bindMediaSession, setMediaSessionState } from './media-session';
import { createPlayerController, type PlayerController } from './player-controller';
import { mediaTitle } from './player-view';
import { loadSettings, saveSettings } from './store';
import { elapsedMs } from './timer';

/**
 * Which way the sound leaves the app. Both routes are built and can be compared on /bench in dev.
 * 'direct' plays straight to the speakers next to a silent audio element that holds the media session.
 */
const AUDIO_ROUTE: OutputRoute = 'direct';

let player: PlayerController | null = null;

/** In dev only, ?unlocked shows the app as it is after the lifetime unlock. Real unlocks come from the server. */
function devUnlocked(): boolean {
  return import.meta.env.DEV && new URLSearchParams(window.location.search).has('unlocked');
}

/**
 * The one player for the whole app. It lives outside React, so the sound keeps
 * playing while you read another page of the app.
 */
export function getPlayer(): PlayerController {
  if (player) return player;

  const engine = createAudioEngine({
    route: AUDIO_ROUTE,
    onInterrupted: () => controller.dispatch({ type: 'pause' }),
  });
  const controller = createPlayerController({
    engine,
    unlocked: devUnlocked(),
    onSettings: (settings) => {
      if (controller.getState().ready) void saveSettings(settings);
    },
    onChange: (state) => {
      setMediaSessionState({
        title: mediaTitle(state),
        playing: state.status === 'playing',
        durationSeconds: state.timer.durationMs / 1000,
        positionSeconds: elapsedMs(state.timer, state.now) / 1000,
      });
    },
  });
  bindMediaSession({
    onPlay: () => controller.dispatch({ type: 'play' }),
    onPause: () => controller.dispatch({ type: 'pause' }),
  });
  void loadSettings().then((settings) => controller.dispatch({ type: 'hydrate', settings }));

  player = controller;
  return controller;
}
