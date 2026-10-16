import { describe, expect, it } from 'vitest';
import { BitPlayback } from './playback.ts';

const batch = (ones: number, size = 50) => '1'.repeat(ones) + '0'.repeat(size - ones);

describe('bit playback', () => {
  it('shows each batch bit by bit at 200 a second', () => {
    const playback = new BitPlayback(200);
    playback.push(batch(50), 1000);
    expect(playback.advance(1000).n).toBe(1);
    expect(playback.advance(1100).n).toBe(21);
    expect(playback.advance(1245).n).toBe(50);
    // It never shows bits it has not received.
    expect(playback.advance(1400).n).toBe(50);
  });

  it('keeps the running deviation of exactly the bits shown', () => {
    const playback = new BitPlayback(200);
    playback.push(batch(30), 0);
    const { newBits, n, deviation } = playback.advance(100);
    expect(n).toBe(21);
    expect(newBits).toHaveLength(21);
    expect(deviation).toBe(21);
    expect(playback.flush()).toMatchObject({ n: 50, deviation: 10 });
  });

  it('a late batch catches up as soon as it arrives', () => {
    const playback = new BitPlayback(200);
    playback.push(batch(25), 0);
    playback.advance(300);
    playback.push(batch(25), 600);
    expect(playback.advance(600).n).toBe(100);
  });

  it('never goes backward', () => {
    const playback = new BitPlayback(200);
    playback.push(batch(25), 0);
    playback.advance(200);
    expect(playback.advance(100).n).toBe(41);
    expect(playback.advance(100).newBits).toHaveLength(0);
  });

  it('shows nothing before the first batch', () => {
    expect(new BitPlayback(200).advance(5000)).toEqual({ newBits: [], n: 0, deviation: 0 });
  });
});
