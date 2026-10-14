import { describe, expect, it } from 'vitest';
import { createPlayerState, reducePlayer, type PlayerAction, type PlayerState } from './player';
import { HEADPHONES_LINE, mediaTitle, viewOf } from './player-view';
import { DEFAULT_SETTINGS, type Settings } from './settings';

const T0 = 1_760_000_000_000;
const ready = (patch: Partial<Settings> = {}, unlocked = false): PlayerState =>
  reducePlayer(createPlayerState(T0, DEFAULT_SETTINGS, unlocked), { type: 'hydrate', settings: { ...DEFAULT_SETTINGS, ...patch } }, T0);
const after = (state: PlayerState, ms: number, action: PlayerAction) => reducePlayer(state, action, state.now + ms);

describe('viewOf', () => {
  it('shows the preset, its beat rate and its wording', () => {
    const view = viewOf(ready({ selection: 'calm' }));
    expect(view.title).toBe('Calm');
    expect(view.line).toBe('6 Hz. Often used for meditation and relaxation.');
    expect(view.clock).toBe('10:00');
    expect(view.clockLabel).toBe('Prime');
    expect(view.lengthLabel).toBe('10 min');
    expect(view.volumeLabel).toBe('30%');
    expect(view.playLabel).toBe('Play');
  });

  it('says the evidence is pending until the research is approved', () => {
    expect(viewOf(ready()).chip).toBe('Evidence: pending');
  });

  it('marks a locked preset as a 60 second preview for free users only', () => {
    const free = viewOf(ready({ selection: 'deep' }));
    expect(free.chip).toBe('60 second preview');
    expect(free.clock).toBe('01:00');
    expect(free.lengthLabel).toBe('60 s');
    expect(free.clockLabel).toBe('Preview');
    expect(viewOf(ready({ selection: 'deep' }, true)).chip).toBe('Evidence: pending');
  });

  it('shows the headphones line until the first session has started', () => {
    expect(viewOf(createPlayerState(T0)).hint).toBeNull();
    expect(viewOf(ready()).hint).toBe(HEADPHONES_LINE);
    expect(viewOf(after(ready(), 0, { type: 'play' })).hint).toBeNull();
  });

  it('counts down and shows Pause while playing, Paused when paused', () => {
    const playing = after(after(ready(), 0, { type: 'play' }), 61_000, { type: 'tick' });
    expect(viewOf(playing).clock).toBe('08:59');
    expect(viewOf(playing).playLabel).toBe('Pause');
    expect(viewOf(after(playing, 0, { type: 'pause' })).clockLabel).toBe('Paused');
  });

  it('says plainly when a prime is complete', () => {
    const done = after(after(ready(), 0, { type: 'play' }), 600_000, { type: 'tick' });
    expect(viewOf(done).title).toBe('Prime complete.');
    expect(viewOf(done).line).toBe('Start your work now.');
    expect(viewOf(done).chip).toBeNull();
  });

  it('says what a completed session was', () => {
    const done = after(after(ready({ mode: 'session', sessionMinutes: 5, selection: 'sleep' }), 0, { type: 'play' }), 300_000, { type: 'tick' });
    expect(viewOf(done).title).toBe('Session complete.');
    expect(viewOf(done).line).toBe('5 minutes of Sleep.');
  });

  it('names a custom beat rate', () => {
    const state = after(ready({}, true), 0, { type: 'customBeat', beat: 14 });
    expect(viewOf(state).title).toBe('Custom');
    expect(viewOf(state).line).toBe('14 Hz. Your own beat rate.');
    expect(viewOf(state).chip).toBeNull();
    expect(mediaTitle(state)).toBe('Custom 14 Hz');
  });

  it('explains when the sound could not start', () => {
    const failed = after(after(ready(), 0, { type: 'play' }), 0, { type: 'failed', message: 'x' });
    expect(viewOf(failed).hint).toBe('The sound could not start. Tap play to try again.');
  });
});
