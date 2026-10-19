import { useEffect, useMemo, useRef, useState } from 'react';
import { createSoundPlayer, type SoundName } from '../audio/sounds';
import { useWakeLock } from '../hooks/useWakeLock';
import { buzz, canVibrate } from '../lib/haptics';

const VIBRATES: Partial<Record<SoundName, 'tok' | 'bell'>> = { tok: 'tok', bell: 'bell' };

/** Development page: try the three sounds, vibration and the wake lock on a real phone. */
export function SoundsPage() {
  const [volume, setVolume] = useState(0.8);
  const player = useMemo(() => createSoundPlayer(0.8), []);
  const { lock, status } = useWakeLock();
  const [audioState, setAudioState] = useState<string>(player.state);
  const [demo, setDemo] = useState<string | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => player.setVolume(volume), [player, volume]);
  useEffect(() => () => player.close(), [player]);
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  async function play(name: SoundName) {
    await player.prepare();
    setAudioState(player.state);
    player.play(name);
    const kind = VIBRATES[name];
    if (kind) buzz(kind);
  }

  async function runDemo() {
    timers.current.forEach((id) => window.clearTimeout(id));
    const steps: [number, SoundName | null, string][] = [
      [0, 'tok', 'Tok: the stretch begins. Close your eyes.'],
      [4000, 'tick', 'Tick played (4 s in).'],
      [10000, 'bell', 'Bell: the stretch is over.'],
      [12500, null, 'Done.'],
    ];
    await player.prepare();
    setAudioState(player.state);
    timers.current = steps.map(([ms, sound, text]) =>
      window.setTimeout(() => {
        if (sound) void play(sound);
        setDemo(text);
      }, ms),
    );
  }

  return (
    <main className="sounds-page">
      <h1>Sound check</h1>
      <p>Try each sound with the phone speaker, then with headphones.</p>

      <section>
        <h2>Sounds</h2>
        <p>
          <button type="button" onClick={() => void play('tok')}>
            Tok
          </button>{' '}
          <button type="button" onClick={() => void play('bell')}>
            Bell
          </button>{' '}
          <button type="button" onClick={() => void play('tick')}>
            Tick
          </button>
        </p>
        <p>
          <label>
            Volume {Math.round(volume * 100)}%{' '}
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
            />
          </label>
        </p>
        <p>
          <button type="button" onClick={() => void runDemo()}>
            Hear a 10 s stretch
          </button>
        </p>
        <p aria-live="polite">{demo}</p>
        <p>Audio: {audioState}</p>
      </section>

      <section>
        <h2>Vibration</h2>
        <p>{canVibrate() ? 'This browser can vibrate.' : 'This browser has no vibration (iPhone, most desktops).'}</p>
        <p>
          <button type="button" onClick={() => buzz('tok')}>
            Start buzz (15, 60, 15 ms)
          </button>{' '}
          <button type="button" onClick={() => buzz('bell')}>
            End buzz (40 ms)
          </button>
        </p>
      </section>

      <section>
        <h2>Screen wake lock</h2>
        <p>Status: {status}</p>
        <p>
          <button type="button" onClick={() => void lock.acquire()}>
            Keep screen on
          </button>{' '}
          <button type="button" onClick={() => void lock.release()}>
            Let it sleep
          </button>
        </p>
      </section>
    </main>
  );
}
