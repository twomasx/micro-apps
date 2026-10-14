import { useEffect, useState } from 'react';
import { describeEntry, lastSevenDays, type HistoryEntry } from '../lib/history';
import { loadHistory } from '../lib/store';
import { canUseCustomBeat, canUseNoise, primeMinutesOptions, sessionMinutesOptions, UNLOCKED_PRIME_MINUTES, UNLOCKED_SESSION_MINUTES } from '../lib/limits';
import { BEAT_MAX_HZ, BEAT_MIN_HZ } from '../lib/frequencies';
import type { NoiseKind } from '../lib/noise';
import { limitOf, selectedPreset, type PlayerAction, type PlayerState } from '../lib/player';
import { HEADPHONES_LINE, SAFETY_LINE } from '../lib/player-view';
import { getProduct, priceLine } from '../lib/products';
import { CUSTOM, type Mode } from '../lib/settings';
import { UNLOCK_ADDS } from '../lib/unlock-copy';
import { LockIcon } from './Icons';
import { Link } from './Link';

interface SheetContentProps {
  state: PlayerState;
  dispatch: (action: PlayerAction) => void;
  /** Called when a free user picks something that needs the unlock. */
  onLocked: () => void;
  onClose: () => void;
}

const MODES: { id: Mode; label: string; text: string }[] = [
  {
    id: 'prime',
    label: 'Prime',
    text: 'A session right before you start work. In studies, listening before a task worked better than listening during it.',
  },
  { id: 'session', label: 'Session', text: 'Listen for as long as you choose.' },
];

export function LengthSheet({ state, dispatch, onLocked }: SheetContentProps) {
  const { mode } = state.settings;
  const prime = mode === 'prime';
  const all = prime ? UNLOCKED_PRIME_MINUTES : UNLOCKED_SESSION_MINUTES;
  const allowed = prime ? primeMinutesOptions(state.unlocked) : sessionMinutesOptions(state.unlocked);
  const limit = limitOf(state);
  const current = limit.preview ? null : limit.durationMs / 60_000;
  const preset = selectedPreset(state);

  return (
    <>
      <div className="segmented" role="group" aria-label="Mode">
        {MODES.map((option) => (
          <button
            key={option.id}
            type="button"
            className="segment"
            aria-pressed={mode === option.id}
            onClick={() => dispatch({ type: 'mode', mode: option.id })}
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className="sheet-text">{MODES.find((option) => option.id === mode)?.text}</p>

      <div className="options" role="group" aria-label="Length in minutes">
        {all.map((minutes) => {
          const locked = !allowed.includes(minutes);
          return (
            <button
              key={minutes}
              type="button"
              className="option"
              aria-pressed={current === minutes}
              data-locked={locked}
              aria-label={locked ? `${minutes} minutes, needs the lifetime unlock` : `${minutes} minutes`}
              onClick={() => (locked ? onLocked() : dispatch({ type: 'minutes', minutes }))}
            >
              {minutes}
              <span className="option-unit"> min</span>
              {locked && <LockIcon />}
            </button>
          );
        })}
      </div>
      {limit.preview && (
        <p className="sheet-text">
          {preset ? preset.name : 'A custom beat rate'} plays as a 60 second preview without the lifetime unlock.
        </p>
      )}
    </>
  );
}

const NOISES: { id: NoiseKind | null; label: string }[] = [
  { id: null, label: 'Off' },
  { id: 'pink', label: 'Pink' },
  { id: 'brown', label: 'Brown' },
];

export function SoundSheet({ state, dispatch, onLocked }: SheetContentProps) {
  const { settings, unlocked } = state;
  const noiseAllowed = canUseNoise(unlocked);
  const customAllowed = canUseCustomBeat(unlocked);
  const noise = noiseAllowed ? settings.noise : null;
  const custom = settings.selection === CUSTOM;

  return (
    <>
      <label className="slider">
        <span className="slider-label">
          Volume <output>{Math.round(settings.volume * 100)}%</output>
        </span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={settings.volume}
          onChange={(event) => dispatch({ type: 'volume', volume: Number(event.target.value) })}
        />
      </label>

      <h3 className="sheet-subtitle">Noise layer {!noiseAllowed && <LockIcon />}</h3>
      <p className="sheet-text">Soft noise under the tones.</p>
      <div className="options" data-columns="3" role="group" aria-label="Noise layer">
        {NOISES.map((option) => (
          <button
            key={option.label}
            type="button"
            className="option"
            aria-pressed={noise === option.id}
            onClick={() => (noiseAllowed || option.id === null ? dispatch({ type: 'noise', kind: option.id }) : onLocked())}
          >
            {option.label}
          </button>
        ))}
      </div>
      {noise !== null && (
        <label className="slider">
          <span className="slider-label">
            Noise volume <output>{Math.round(settings.noiseVolume * 100)}%</output>
          </span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={settings.noiseVolume}
            onChange={(event) => dispatch({ type: 'noiseVolume', volume: Number(event.target.value) })}
          />
        </label>
      )}

      <h3 className="sheet-subtitle">Your own beat rate {!customAllowed && <LockIcon />}</h3>
      {customAllowed ? (
        <label className="slider">
          <span className="slider-label">
            {custom ? 'Playing' : 'Slide to use'} <output>{settings.customBeat} Hz</output>
          </span>
          <input
            type="range"
            min={BEAT_MIN_HZ}
            max={BEAT_MAX_HZ}
            step="1"
            value={settings.customBeat}
            onChange={(event) => dispatch({ type: 'customBeat', beat: Number(event.target.value) })}
          />
        </label>
      ) : (
        <>
          <p className="sheet-text">Any beat rate from 1 to 40 Hz.</p>
          <button type="button" className="button-quiet" onClick={onLocked}>
            See the lifetime unlock
          </button>
        </>
      )}
    </>
  );
}

export function MenuSheet({ unlocked, onHistory }: { unlocked: boolean; onHistory: () => void }) {
  return (
    <>
      <nav className="menu" aria-label="More about Focus">
        <button type="button" className="menu-link" onClick={onHistory}>
          Session history {!unlocked && <LockIcon />}
        </button>
        <Link to="science" replace className="menu-link">
          The science
        </Link>
        <Link to="unlock" replace className="menu-link">
          {unlocked ? 'Your unlock code' : 'Lifetime unlock'}
        </Link>
        <Link to="restore" replace className="menu-link">
          Restore purchase
        </Link>
        <Link to="privacy" replace className="menu-link">
          Privacy
        </Link>
      </nav>
      <p className="sheet-small">{SAFETY_LINE}</p>
    </>
  );
}

export function OfferSheet({ onClose }: Pick<SheetContentProps, 'onClose'>) {
  return (
    <>
      <ul className="adds">
        {UNLOCK_ADDS.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="price">{priceLine(getProduct('lifetime'))}</p>
      <Link to="unlock" replace className="button-primary">
        See the lifetime unlock
      </Link>
      <button type="button" className="button-quiet" onClick={onClose}>
        Not now
      </button>
    </>
  );
}

export function IntroSheet({ onStart, onClose }: { onStart: () => void; onClose: () => void }) {
  return (
    <>
      <p className="sheet-text">
        Listen for 10 minutes right before you start. In studies, listening before a task worked better than
        listening during it.
      </p>
      <p className="sheet-text sheet-strong">{HEADPHONES_LINE}</p>
      <p className="sheet-small">{SAFETY_LINE}</p>
      <button type="button" className="button-primary" onClick={onStart}>
        Start a 10 minute prime
      </button>
      <button type="button" className="button-quiet" onClick={onClose}>
        Look around first
      </button>
    </>
  );
}

export function HistorySheet() {
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [now] = useState(() => Date.now());
  useEffect(() => {
    void loadHistory().then(setHistory);
  }, []);

  if (history === null) return null;
  if (history.length === 0) {
    return <p className="sheet-text">Finished sessions show here, with the date, the preset and the length.</p>;
  }
  const week = lastSevenDays(history, now);
  return (
    <>
      <p className="sheet-text sheet-strong">
        Last 7 days: {week.sessions} {week.sessions === 1 ? 'session' : 'sessions'}, {week.minutes} min
      </p>
      <ol className="history">
        {history.slice(0, 50).map((entry) => (
          <li key={entry.at} className="history-row">
            <span className="history-name">{entry.name}</span>
            <span className="history-detail">{describeEntry(entry)}</span>
            <time className="history-when" dateTime={new Date(entry.at).toISOString()}>
              {formatWhen(entry.at)}
            </time>
          </li>
        ))}
      </ol>
      {history.length > 50 && <p className="sheet-small">The 50 most recent of {history.length}.</p>}
    </>
  );
}

const WHEN = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

function formatWhen(at: number): string {
  return WHEN.format(new Date(at));
}
