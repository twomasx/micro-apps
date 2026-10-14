import { limitOf, selectedPreset, type PlayerState } from './player';
import { formatClock, remainingMs } from './timer';

/** The words on the player screen for a given state. Kept out of the components. */
export interface PlayerView {
  title: string;
  line: string;
  /** Small label under the line, or null for none. */
  chip: string | null;
  clock: string;
  /** Small word under the clock. */
  clockLabel: string;
  modeLabel: string;
  lengthLabel: string;
  volumeLabel: string;
  playLabel: string;
  /** One line above the controls, or null. */
  hint: string | null;
}

export const HEADPHONES_LINE = 'Put your headphones on. Binaural beats only work with headphones.';
export const SAFETY_LINE =
  "Don't use while driving or doing anything that needs your full attention. If you have epilepsy or a seizure disorder, check with a doctor first.";

export function viewOf(state: PlayerState): PlayerView {
  const preset = selectedPreset(state);
  const { settings } = state;
  const name = preset ? preset.name : 'Custom';
  const beat = preset ? preset.beat : settings.customBeat;
  const limit = limitOf(state);
  const minutes = Math.round(state.timer.durationMs / 60_000);
  const prime = settings.mode === 'prime';

  let title = name;
  let line = `${beat} Hz. ${preset ? preset.wording : 'Your own beat rate.'}`;
  let chip: string | null = null;
  if (state.completed === 'prime') {
    title = 'Prime complete.';
    line = 'Start your work now.';
  } else if (state.completed === 'session') {
    title = 'Session complete.';
    line = `${minutes} minutes of ${name}.`;
  } else if (limit.preview) {
    chip = '60 second preview';
  } else if (preset) {
    chip = preset.evidence ?? 'Evidence: pending';
  }

  let clockLabel = limit.preview ? 'Preview' : prime ? 'Prime' : 'Session';
  if (state.status === 'paused') clockLabel = 'Paused';

  let hint: string | null = null;
  if (state.error) hint = 'The sound could not start. Tap play to try again.';
  else if (state.ready && !settings.hasPlayed) hint = HEADPHONES_LINE;

  return {
    title,
    line,
    chip,
    clock: formatClock(remainingMs(state.timer, state.now)),
    clockLabel,
    modeLabel: prime ? 'Prime' : 'Session',
    lengthLabel: limit.preview ? '60 s' : `${limit.durationMs / 60_000} min`,
    volumeLabel: `${Math.round(settings.volume * 100)}%`,
    playLabel: state.status === 'playing' ? 'Pause' : 'Play',
    hint,
  };
}

/** Title for the lock screen and notification. */
export function mediaTitle(state: PlayerState): string {
  const preset = selectedPreset(state);
  return preset ? preset.name : `Custom ${state.settings.customBeat} Hz`;
}
