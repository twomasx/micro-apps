import { useState } from 'react';
import { LockIcon, MenuIcon, PauseIcon, PlayIcon } from '../components/Icons';
import { Orbit } from '../components/Orbit';
import { IntroSheet, LengthSheet, MenuSheet, OfferSheet, SoundSheet } from '../components/PlayerSheets';
import { Sheet } from '../components/Sheet';
import { Sky } from '../components/Sky';
import { usePlayer } from '../hooks/usePlayer';
import { useShortcuts } from '../hooks/useShortcuts';
import { isPresetLocked } from '../lib/limits';
import { toneOf } from '../lib/player';
import { viewOf } from '../lib/player-view';
import { presets } from '../lib/presets';
import { tintFor } from '../orbit/tints';
import '../styles/player.css';

type SheetName = 'length' | 'sound' | 'menu' | 'offer';

const SHEET_TITLES: Record<SheetName | 'intro' | 'preview', string> = {
  length: 'Length',
  sound: 'Sound',
  menu: 'Focus',
  offer: 'Lifetime unlock',
  preview: 'That was the 60 second preview',
  intro: 'Prime before you work',
};

export function PlayerPage() {
  const [state, dispatch] = usePlayer();
  const [chosen, setChosen] = useState<SheetName | null>(null);
  const view = viewOf(state);
  const tint = tintFor(state.settings.selection);

  // The first-visit sheet and the offer after a preview open by themselves.
  const previewEnded = state.completed === 'preview';
  const sheet: SheetName | 'intro' | 'preview' | null =
    chosen ?? (previewEnded ? 'preview' : state.ready && !state.settings.introSeen ? 'intro' : null);

  const closeSheet = () => {
    if (sheet === 'intro') dispatch({ type: 'introSeen' });
    if (sheet === 'preview') dispatch({ type: 'dismiss' });
    setChosen(null);
  };
  const startPrime = () => {
    dispatch({ type: 'introSeen' });
    dispatch({ type: 'mode', mode: 'prime' });
    dispatch({ type: 'minutes', minutes: 10 });
    dispatch({ type: 'play' });
  };

  useShortcuts({
    enabled: sheet === null,
    onToggle: () => dispatch({ type: 'toggle' }),
    onPreset: (index) => {
      const preset = presets[index];
      if (preset) dispatch({ type: 'select', id: preset.id });
    },
  });

  const sheetProps = { state, dispatch, onClose: closeSheet, onLocked: () => setChosen('offer') };
  const complete = state.status === 'complete' && !previewEnded;

  return (
    <div className="player" data-state={state.status} data-ready={state.ready}>
      <Sky nebula={tint.nebula} state={state.status} />

      <header className="topbar">
        <p className="headphones">
          <span className="headphones-dot" />
          Headphones on
        </p>
        <button type="button" className="icon-button" aria-label="Menu" onClick={() => setChosen('menu')}>
          <MenuIcon />
        </button>
      </header>

      <main className="player-main">
        <div className="head" data-complete={complete}>
          <h1 className="preset-name">{view.title}</h1>
          <p className="preset-line">{view.line}</p>
          <p className="chip-row">{view.chip && <span className="chip">{view.chip}</span>}</p>
        </div>

        <Orbit beat={toneOf(state).beat} status={state.status} timer={state.timer} companion={tint.companion}>
          <div className="clock" data-state={state.status}>
            <span className="clock-time" role="timer" aria-label={`${view.clock} left`}>
              {[...view.clock].map((character, index) => (
                <span key={index} className={character === ':' ? 'clock-colon' : 'clock-digit'} aria-hidden="true">
                  {character}
                </span>
              ))}
            </span>
            <span className="clock-label">{view.clockLabel}</span>
          </div>
        </Orbit>

        <div className="foot">
          <div className="hint" role="status">
            {complete ? (
              <button type="button" className="button-quiet" onClick={() => dispatch({ type: 'dismiss' })}>
                Done
              </button>
            ) : (
              view.hint
            )}
          </div>

          <div className="controls">
            <button type="button" className="side-button" onClick={() => setChosen('length')}>
              <span className="side-caption">{view.modeLabel}</span>
              <span className="side-value">{view.lengthLabel}</span>
            </button>
            <button
              type="button"
              className="play"
              aria-label={view.playLabel}
              data-state={state.status}
              onClick={() => dispatch({ type: 'toggle' })}
            >
              {state.status === 'playing' ? <PauseIcon /> : <PlayIcon />}
            </button>
            <button type="button" className="side-button" onClick={() => setChosen('sound')}>
              <span className="side-caption">Volume</span>
              <span className="side-value">{view.volumeLabel}</span>
            </button>
          </div>

          <div className="presets" role="group" aria-label="Presets">
            {presets.map((preset) => {
              const locked = isPresetLocked(preset, state.unlocked);
              return (
                <button
                  key={preset.id}
                  type="button"
                  className="preset"
                  aria-pressed={state.settings.selection === preset.id}
                  aria-label={`${preset.name}, ${preset.beat} Hz${locked ? ', 60 second preview' : ''}`}
                  data-locked={locked}
                  onClick={() => dispatch({ type: 'select', id: preset.id })}
                >
                  {preset.short}
                  {locked && <LockIcon />}
                </button>
              );
            })}
          </div>
          <p className="keys-hint">Space plays and pauses. Keys 1 to 5 pick a preset.</p>
        </div>
      </main>

      <Sheet open={sheet !== null} onClose={closeSheet} title={sheet ? SHEET_TITLES[sheet] : ''} name={sheet ?? ''}>
        {sheet === 'length' && <LengthSheet {...sheetProps} />}
        {sheet === 'sound' && <SoundSheet {...sheetProps} />}
        {sheet === 'menu' && <MenuSheet />}
        {(sheet === 'offer' || sheet === 'preview') && <OfferSheet onClose={closeSheet} />}
        {sheet === 'intro' && <IntroSheet onStart={startPrime} onClose={closeSheet} />}
      </Sheet>
    </div>
  );
}
