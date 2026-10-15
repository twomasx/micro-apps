import { useMemo } from 'react';
import { createSoundPlayer } from '../audio/sounds';
import { updateSettings } from '../lib/app-data';
import type { Settings } from '../lib/settings';
import { Link } from './Link';
import { Sheet } from './Sheet';

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
  settings: Settings;
}

export function SettingsSheet({ open, onClose, settings }: SettingsSheetProps) {
  const player = useMemo(() => createSoundPlayer(settings.volume), []); // eslint-disable-line react-hooks/exhaustive-deps

  async function preview() {
    player.setVolume(settings.volume);
    await player.prepare();
    player.play('bell');
  }

  return (
    <Sheet open={open} onClose={onClose} title="Settings" name="settings">
      <div className="setting">
        <label className="setting-label" htmlFor="volume">
          Volume <span className="setting-value">{Math.round(settings.volume * 100)}%</span>
        </label>
        <input
          id="volume"
          className="range"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={settings.volume}
          onChange={(event) => updateSettings({ volume: Number(event.target.value) })}
        />
        <p className="setting-help">One volume for the tok, the bell and the tick.</p>
        <button type="button" className="button button-quiet" onClick={() => void preview()}>
          Play the bell
        </button>
      </div>

      <div className="setting">
        <label className="switch">
          <input
            type="checkbox"
            role="switch"
            checked={settings.probes}
            onChange={(event) => updateSettings({ probes: event.target.checked })}
          />
          <span className="switch-text">
            Tick probes <span className="tag">Experimental</span>
          </span>
        </label>
        <p className="setting-help">
          In about 1 in 4 stretches, a very quiet tick plays. Tap the screen if you hear it. It never changes how long
          your stretches are. <Link to="science" replace>How it works</Link>
        </p>
      </div>
    </Sheet>
  );
}
