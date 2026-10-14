import { describe, expect, it } from 'vitest';
import { breathAt, breathAtEnd, easeInOut, phaseKey, phaseLevels } from './engine';
import { cycleMs, findTechnique, type Technique } from './techniques';

function technique(id: string): Technique {
  const found = findTechnique(id);
  if (!found) throw new Error(`missing technique ${id}`);
  return found;
}

const box = technique('box');
const sigh = technique('sigh');
const fourSevenEight = technique('478');
const resonant = technique('resonant');

describe('breathAt: box (4 in, 4 hold, 4 out, 4 hold)', () => {
  it('starts breathing in with empty lungs', () => {
    const b = breathAt(box, 0);
    expect(b.phaseIndex).toBe(0);
    expect(b.phase.kind).toBe('in');
    expect(b.progress).toBe(0);
    expect(b.secondsLeft).toBe(4);
    expect(b.lungLevel).toBe(0);
    expect(b.cycle).toBe(0);
  });

  it('is half way through breathing in at 2 s, with half full lungs', () => {
    const b = breathAt(box, 2000);
    expect(b.progress).toBe(0.5);
    expect(b.lungLevel).toBeCloseTo(0.5);
    expect(b.secondsLeft).toBe(2);
  });

  it('changes phase exactly on the boundary', () => {
    expect(breathAt(box, 3999).phaseIndex).toBe(0);
    expect(breathAt(box, 4000).phaseIndex).toBe(1);
    expect(breathAt(box, 4000).phase.kind).toBe('hold');
    expect(breathAt(box, 8000).phase.kind).toBe('out');
    expect(breathAt(box, 12000).phase.kind).toBe('hold');
  });

  it('holds full lungs after breathing in and empty lungs after breathing out', () => {
    expect(breathAt(box, 6000).lungLevel).toBe(1);
    expect(breathAt(box, 14000).lungLevel).toBe(0);
  });

  it('counts down whole seconds, rounding up, and never shows 0', () => {
    expect(breathAt(box, 1).secondsLeft).toBe(4);
    expect(breathAt(box, 1000).secondsLeft).toBe(3);
    expect(breathAt(box, 3001).secondsLeft).toBe(1);
    expect(breathAt(box, 3999.9).secondsLeft).toBe(1);
  });

  it('starts the next breath after 16 s', () => {
    const b = breathAt(box, 16000);
    expect(b.cycle).toBe(1);
    expect(b.phaseIndex).toBe(0);
    expect(b.cycleProgress).toBe(0);
  });

  it('stays exact after many breaths', () => {
    const b = breathAt(box, 16000 * 75 + 9000);
    expect(b.cycle).toBe(75);
    expect(b.phase.kind).toBe('out');
    expect(b.progress).toBe(0.25);
  });

  it('treats bad times as the start', () => {
    expect(breathAt(box, -500).phaseIndex).toBe(0);
    expect(breathAt(box, Number.NaN).progress).toBe(0);
  });
});

describe('breathAt: cyclic sigh (2 in, 1 top-up in, 6 out)', () => {
  it('fills two thirds on the first breath in and the rest on the top-up', () => {
    expect(breathAt(sigh, 2000).phaseIndex).toBe(1);
    expect(breathAt(sigh, 2000).lungLevel).toBeCloseTo(2 / 3);
    expect(breathAt(sigh, 2999).lungLevel).toBeGreaterThan(0.99);
    expect(breathAt(sigh, 3000).lungLevel).toBe(1);
  });

  it('labels the top-up breath and its hint', () => {
    const b = breathAt(sigh, 2500);
    expect(b.phase.word).toBe('Inhale again');
    expect(b.phase.hint).toBe('A short top-up breath');
  });

  it('breathes out for 6 s', () => {
    expect(breathAt(sigh, 3000).phase.kind).toBe('out');
    expect(breathAt(sigh, 3000).secondsLeft).toBe(6);
    expect(breathAt(sigh, 6000).lungLevel).toBeCloseTo(0.5);
    expect(breathAt(sigh, 9000).cycle).toBe(1);
  });
});

describe('breathAt: 4-7-8 and resonant', () => {
  it('runs 4-7-8 as a 19 s breath', () => {
    expect(cycleMs(fourSevenEight)).toBe(19000);
    expect(breathAt(fourSevenEight, 4000).phase.kind).toBe('hold');
    expect(breathAt(fourSevenEight, 4000).secondsLeft).toBe(7);
    expect(breathAt(fourSevenEight, 11000).phase.kind).toBe('out');
    expect(breathAt(fourSevenEight, 11000).secondsLeft).toBe(8);
  });

  it('runs resonant at 5.5 s each way, exactly', () => {
    expect(cycleMs(resonant)).toBe(11000);
    expect(breathAt(resonant, 5499).phase.kind).toBe('in');
    expect(breathAt(resonant, 5500).phase.kind).toBe('out');
    expect(breathAt(resonant, 0).secondsLeft).toBe(6);
    expect(breathAt(resonant, 2750).lungLevel).toBeCloseTo(0.5);
  });
});

describe('lung level', () => {
  it('stays between 0 and 1 and moves smoothly through a whole breath', () => {
    for (const t of [box, sigh, fourSevenEight, resonant]) {
      let previous = breathAt(t, 0).lungLevel;
      for (let ms = 0; ms <= cycleMs(t); ms += 50) {
        const level = breathAt(t, ms).lungLevel;
        expect(level).toBeGreaterThanOrEqual(0);
        expect(level).toBeLessThanOrEqual(1);
        expect(Math.abs(level - previous)).toBeLessThan(0.05);
        previous = level;
      }
    }
  });

  it('gives each phase a start and end level', () => {
    expect(phaseLevels(box.phases)).toEqual([
      { from: 0, to: 1 },
      { from: 1, to: 1 },
      { from: 1, to: 0 },
      { from: 0, to: 0 },
    ]);
  });

  it('eases in and out', () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(0.5)).toBeCloseTo(0.5);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(0.1)).toBeLessThan(0.1);
    expect(easeInOut(2)).toBe(1);
  });
});

describe('phaseKey', () => {
  it('changes with the phase and with the breath', () => {
    const keys = new Set([0, 4000, 8000, 12000, 16000, 20000].map((ms) => phaseKey(breathAt(box, ms))));
    expect(keys.size).toBe(6);
    expect(phaseKey(breathAt(box, 100))).toBe(phaseKey(breathAt(box, 3900)));
  });
});

describe('breathAtEnd', () => {
  it('shows the last phase of the last breath, finished, with empty lungs', () => {
    const end = breathAtEnd(sigh, 33 * 9000);
    expect(end.phase.kind).toBe('out');
    expect(end.progress).toBe(1);
    expect(end.secondsLeft).toBe(0);
    expect(end.lungLevel).toBe(0);
    expect(end.cycle).toBe(32);
    expect(breathAtEnd(box, 16_000).phaseIndex).toBe(3);
  });
});
