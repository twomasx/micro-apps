import { checkCode } from './api';
import { createAudioEngine, type OutputRoute } from './audio';
import { bindMediaSession, setMediaSessionState } from './media-session';
import { selectedPreset, toneOf, type PlayerState } from './player';
import { createPlayerController, type PlayerController } from './player-controller';
import { canSaveHistory } from './limits';
import { mediaTitle } from './player-view';
import { loadSettings, loadUnlock, recordSession, saveSettings, saveUnlock } from './store';
import { elapsedMs, type SessionTimer } from './timer';
import { pass } from './pass-state';
import { refreshUnlock } from './unlock';

/**
 * Which way the sound leaves the app. Both routes are built and can be compared on /bench in dev.
 * 'direct' plays straight to the speakers next to a silent audio element that holds the media session.
 */
const AUDIO_ROUTE: OutputRoute = 'direct';

let player: PlayerController | null = null;
/** The timer of the last session written to history, so one session is written once. */
let recordedTimer: SessionTimer | null = null;

/** Focus's own lifetime unlock, as opposed to the all-app pass. */
let ownUnlocked = false;

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
      recordIfFinished(state);
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
  // Unlocked with Focus's own purchase or with an active all-app pass.
  const publish = () =>
    controller.dispatch({ type: 'setUnlocked', unlocked: ownUnlocked || pass.isActive() || devUnlocked() });
  pass.subscribe(publish);
  // main.tsx may have started the pass already (a ?passToken= on any page); publish its answer either way.
  void pass.start().then(publish);
  void refreshUnlock({
    load: loadUnlock,
    save: saveUnlock,
    check: checkCode,
    online: () => navigator.onLine,
    now: Date.now,
    apply: (unlocked) => {
      ownUnlocked = unlocked;
      publish();
    },
  });

  player = controller;
  return controller;
}

/** Session history is part of the lifetime unlock. Only finished sessions are written, not previews. */
function recordIfFinished(state: PlayerState) {
  if (state.status !== 'complete' || state.completed === 'preview' || state.completed === null) return;
  if (!canSaveHistory(state.unlocked) || state.timer === recordedTimer) return;
  recordedTimer = state.timer;
  void recordSession({
    at: state.now,
    name: selectedPreset(state)?.name ?? 'Custom',
    beat: toneOf(state).beat,
    minutes: Math.round(state.timer.durationMs / 60_000),
    mode: state.completed,
  });
}

/** After a purchase or a restored code: remember the code on this device and unlock the player. */
export async function unlockWithCode(code: string): Promise<void> {
  await saveUnlock({ code, valid: true, checkedAt: Date.now() });
  ownUnlocked = true;
  getPlayer().dispatch({ type: 'setUnlocked', unlocked: true });
}
