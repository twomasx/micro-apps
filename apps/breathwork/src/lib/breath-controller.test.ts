import { describe, expect, it, vi } from 'vitest';
import { createBreathController, type ControllerDeps } from './breath-controller';
import type { CueKind } from './cues';
import { findTechnique } from './techniques';

const box = findTechnique('box')!;
const sigh = findTechnique('sigh')!;

/** A fake browser: time moves only when the test says, frames run only when the test says. */
function setup(technique = box, durationMs = 32_000) {
  let now = 0;
  let nextId = 1;
  const frames = new Map<number, () => void>();
  let hidden = false;
  let onVisibility = () => {};
  const cues: CueKind[] = [];
  const buzzes: CueKind[] = [];
  let muted = false;
  const wakeLock = { acquire: vi.fn(() => Promise.resolve('on' as const)), release: vi.fn(() => Promise.resolve()) };
  const deps: ControllerDeps = {
    now: () => now,
    requestFrame: (callback) => {
      const id = nextId++;
      frames.set(id, callback);
      return id;
    },
    cancelFrame: (id) => frames.delete(id),
    cues: {
      prepare: vi.fn(() => Promise.resolve()),
      play: (kind) => {
        if (!muted) cues.push(kind);
      },
      setMuted: (value) => (muted = value),
      get muted() {
        return muted;
      },
    },
    vibrate: (kind) => buzzes.push(kind),
    wakeLock,
    visibility: {
      isHidden: () => hidden,
      subscribe: (onChange) => {
        onVisibility = onChange;
        return () => (onVisibility = () => {});
      },
    },
  };
  const controller = createBreathController(technique, durationMs, deps);
  const disconnect = controller.connect();
  return {
    disconnect,
    controller,
    deps,
    cues,
    buzzes,
    wakeLock,
    /** Moves time on and runs the frame that was waiting, like one requestAnimationFrame. */
    advance(ms: number) {
      now += ms;
      const waiting = [...frames.values()];
      frames.clear();
      for (const callback of waiting) callback();
    },
    pendingFrames: () => frames.size,
    setHidden(value: boolean) {
      hidden = value;
      onVisibility();
    },
  };
}

describe('breath controller', () => {
  it('is ready at the start of the first breath before you start', () => {
    const { controller, cues } = setup();
    const frame = controller.frame();
    expect(frame.status).toBe('ready');
    expect(frame.breath.phaseIndex).toBe(0);
    expect(frame.remainingMs).toBe(32_000);
    expect(cues).toEqual([]);
  });

  it('cues the first phase on start, then each phase change once', () => {
    const t = setup();
    t.controller.start();
    expect(t.cues).toEqual(['in']);
    for (let i = 0; i < 40; i++) t.advance(100); // 4 s of frames
    expect(t.cues).toEqual(['in', 'hold']);
    for (let i = 0; i < 120; i++) t.advance(100); // 12 s more: out, hold, then the next breath in
    expect(t.cues).toEqual(['in', 'hold', 'out', 'hold', 'in']);
    expect(t.buzzes).toEqual(t.cues);
  });

  it('cues the top-up breath of the cyclic sigh as its own cue', () => {
    const t = setup(sigh, 9000);
    t.controller.start();
    t.advance(2000);
    t.advance(1000);
    expect(t.cues).toEqual(['in', 'inAgain', 'out']);
  });

  it('stays exact when frames are slow or dropped', () => {
    const t = setup();
    t.controller.start();
    t.advance(9_000); // one frame after 9 s
    const frame = t.controller.frame();
    expect(frame.elapsedMs).toBe(9000);
    expect(frame.breath.phase.kind).toBe('out');
    expect(frame.breath.progress).toBe(0.25);
    // Only the phase you are in is cued, not the ones skipped over.
    expect(t.cues).toEqual(['in', 'out']);
  });

  it('holds the screen awake while running and lets go on pause', () => {
    const t = setup();
    t.controller.start();
    expect(t.wakeLock.acquire).toHaveBeenCalledOnce();
    expect(t.deps.cues.prepare).toHaveBeenCalledOnce();
    t.advance(1000);
    t.controller.pause();
    expect(t.wakeLock.release).toHaveBeenCalled();
    expect(t.controller.frame().status).toBe('paused');
    expect(t.pendingFrames()).toBe(0);
  });

  it('does not count while paused, and resumes without repeating the cue', () => {
    const t = setup();
    t.controller.start();
    t.advance(1000);
    t.controller.pause();
    t.advance(60_000);
    expect(t.controller.frame().elapsedMs).toBe(1000);
    t.controller.toggle();
    t.advance(500);
    expect(t.controller.frame().elapsedMs).toBe(1500);
    expect(t.cues).toEqual(['in']);
  });

  it('pauses when the page is hidden and says so when you come back', () => {
    const t = setup();
    t.controller.start();
    t.advance(2000);
    t.setHidden(true);
    expect(t.controller.frame().status).toBe('paused');
    expect(t.controller.snapshot().notice).toBe('away');
    expect(t.wakeLock.release).toHaveBeenCalled();
    t.advance(120_000);
    t.setHidden(false);
    expect(t.controller.frame().elapsedMs).toBe(2000);
    expect(t.controller.snapshot().notice).toBe('away');
    t.controller.start();
    expect(t.controller.snapshot().notice).toBeNull();
  });

  it('a pause you make yourself shows no notice', () => {
    const t = setup();
    t.controller.start();
    t.advance(1000);
    t.controller.pause();
    t.setHidden(true);
    expect(t.controller.snapshot().notice).toBeNull();
  });

  it('finishes once at the end, with a done cue, and releases the wake lock', () => {
    const t = setup(box, 16_000);
    const done = vi.fn();
    t.controller.onComplete(done);
    t.controller.start();
    for (let i = 0; i < 200; i++) t.advance(100);
    expect(done).toHaveBeenCalledOnce();
    expect(t.controller.frame().status).toBe('complete');
    expect(t.controller.frame().elapsedMs).toBe(16_000);
    expect(t.controller.frame().breath).toMatchObject({ phaseIndex: 3, progress: 1, cycle: 0 });
    expect(t.cues.at(-1)).toBe('done');
    expect(t.wakeLock.release).toHaveBeenCalled();
    expect(t.pendingFrames()).toBe(0);
  });

  it('starts over after it is complete', () => {
    const t = setup(box, 16_000);
    t.controller.start();
    t.advance(16_000);
    t.controller.start();
    expect(t.controller.frame().status).toBe('running');
    expect(t.controller.frame().elapsedMs).toBe(0);
  });

  it('stops and starts over when you pick another technique', () => {
    const t = setup();
    t.controller.start();
    t.advance(5000);
    t.controller.select(sigh, 9000);
    const frame = t.controller.frame();
    expect(frame.technique.id).toBe('sigh');
    expect(frame.status).toBe('ready');
    expect(frame.durationMs).toBe(9000);
    expect(t.pendingFrames()).toBe(0);
  });

  it('plays no sound when muted, but still buzzes', () => {
    const t = setup();
    t.controller.setMuted(true);
    t.controller.start();
    expect(t.cues).toEqual([]);
    expect(t.buzzes).toEqual(['in']);
    expect(t.controller.snapshot().muted).toBe(true);
  });

  it('starts no audio while muted, so your music keeps playing, and starts it when sound goes on', () => {
    const t = setup();
    t.controller.setMuted(true);
    t.controller.start();
    expect(t.deps.cues.prepare).not.toHaveBeenCalled();
    t.controller.setMuted(false);
    expect(t.deps.cues.prepare).toHaveBeenCalledOnce();
  });

  it('sends every frame to themes but tells React only when the text changes', () => {
    const t = setup();
    const frames = vi.fn();
    const changes = vi.fn();
    t.controller.onFrame(frames);
    t.controller.subscribe(changes);
    t.controller.start();
    for (let i = 0; i < 10; i++) t.advance(16); // 160 ms: same phase, same second
    expect(frames).toHaveBeenCalledTimes(11);
    expect(changes).toHaveBeenCalledTimes(1); // ready to running
    const before = t.controller.snapshot();
    t.advance(16);
    expect(t.controller.snapshot()).toBe(before);
    t.advance(1000);
    expect(t.controller.snapshot().secondsLeft).toBe(3);
  });

  it('stops the session and stops watching the page on disconnect', () => {
    const t = setup();
    t.controller.start();
    t.advance(1000);
    t.disconnect();
    expect(t.wakeLock.release).toHaveBeenCalled();
    expect(t.pendingFrames()).toBe(0);
    expect(t.controller.frame().status).toBe('paused');
    t.controller.start();
    t.setHidden(true);
    expect(t.controller.frame().status).toBe('running');
  });
});
