import { cycleMs, type Phase, type Technique } from './techniques';

/** Where you are in the breath at one moment. Everything a theme needs to draw it. */
export interface BreathState {
  phaseIndex: number;
  phase: Phase;
  /** Progress through this phase, 0 to 1, linear in time. The dot moves at this even pace. */
  progress: number;
  phaseElapsedMs: number;
  phaseRemainingMs: number;
  /** The countdown shown on screen. Rounds up, so it reads 1 in the last second, never 0. */
  secondsLeft: number;
  /** How full the lungs are, 0 (empty) to 1 (full), eased within each phase. */
  lungLevel: number;
  /** Breaths finished before this one. */
  cycle: number;
  /** Progress through the whole breath, 0 to 1. */
  cycleProgress: number;
}

/** Eases in and out, so the lungs start and stop filling gently. 0 maps to 0, 1 to 1. */
export function easeInOut(t: number): number {
  return 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, t)));
}

/**
 * Lung level at the start and end of each phase. Lungs start a breath empty.
 * A run of in phases fills them to 1, split by time (the cyclic sigh's 2 s breath fills
 * two thirds, the 1 s top-up the rest). A run of out phases empties them the same way.
 * Holds keep the level.
 */
export function phaseLevels(phases: readonly Phase[]): { from: number; to: number }[] {
  const levels: { from: number; to: number }[] = [];
  let level = 0;
  let i = 0;
  while (i < phases.length) {
    const kind = phases[i]!.kind;
    let end = i;
    while (end + 1 < phases.length && phases[end + 1]!.kind === kind) end++;
    const run = phases.slice(i, end + 1);
    const runMs = run.reduce((sum, p) => sum + p.ms, 0);
    const target = kind === 'in' ? 1 : kind === 'out' ? 0 : level;
    const start = level;
    let doneMs = 0;
    for (const phase of run) {
      const from = level;
      doneMs += phase.ms;
      level = start + (target - start) * (doneMs / runMs);
      levels.push({ from, to: level });
    }
    i = end + 1;
  }
  return levels;
}

const levelCache = new WeakMap<readonly Phase[], { from: number; to: number }[]>();

function levelsFor(phases: readonly Phase[]) {
  let levels = levelCache.get(phases);
  if (!levels) {
    levels = phaseLevels(phases);
    levelCache.set(phases, levels);
  }
  return levels;
}

/** The breath at `elapsedMs` into a session of this technique. Pure: same input, same answer. */
export function breathAt(technique: Pick<Technique, 'phases'>, elapsedMs: number): BreathState {
  const { phases } = technique;
  const total = cycleMs(technique);
  const elapsed = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0);
  const cycle = Math.floor(elapsed / total);
  const intoCycle = elapsed - cycle * total;

  let phaseIndex = 0;
  let phaseStart = 0;
  while (phaseIndex < phases.length - 1 && intoCycle >= phaseStart + phases[phaseIndex]!.ms) {
    phaseStart += phases[phaseIndex]!.ms;
    phaseIndex++;
  }
  const phase = phases[phaseIndex]!;
  const phaseElapsedMs = intoCycle - phaseStart;
  const phaseRemainingMs = phase.ms - phaseElapsedMs;
  const progress = phaseElapsedMs / phase.ms;
  const { from, to } = levelsFor(phases)[phaseIndex]!;

  return {
    phaseIndex,
    phase,
    progress,
    phaseElapsedMs,
    phaseRemainingMs,
    secondsLeft: Math.max(1, Math.ceil(phaseRemainingMs / 1000)),
    lungLevel: from + (to - from) * easeInOut(progress),
    cycle,
    cycleProgress: intoCycle / total,
  };
}

/**
 * The moment a session ends: the last phase of the last breath, finished. Sessions are whole
 * breaths, so at the end `breathAt` would already show the next breath starting.
 */
export function breathAtEnd(technique: Pick<Technique, 'phases'>, elapsedMs: number): BreathState {
  const { phases } = technique;
  const last = phases.length - 1;
  const phase = phases[last]!;
  const breaths = Math.max(1, Math.round(Math.max(0, elapsedMs) / cycleMs(technique)));
  return {
    phaseIndex: last,
    phase,
    progress: 1,
    phaseElapsedMs: phase.ms,
    phaseRemainingMs: 0,
    secondsLeft: 0,
    lungLevel: levelsFor(phases)[last]!.to,
    cycle: breaths - 1,
    cycleProgress: 1,
  };
}

/** A number that changes exactly when the phase changes, across breaths too. */
export function phaseKey(breath: Pick<BreathState, 'cycle' | 'phaseIndex'>): number {
  return breath.cycle * 64 + breath.phaseIndex;
}
