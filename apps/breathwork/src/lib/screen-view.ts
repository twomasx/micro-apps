import type { BreathSnapshot } from './breath-controller';
import { formatClock } from './session';
import { cycleMs, type PhaseKind, type Technique } from './techniques';

/** What the text under the shape says. */
export interface NowText {
  word: string;
  hint: string;
  /** The yellow countdown, or null when there is nothing to count. */
  count: string | null;
  /** For styling: the phase, or the moment around it. */
  kind: PhaseKind | 'ready' | 'done';
}

export interface ViewContext {
  technique: Technique;
  durationMs: number;
  preview: boolean;
}

/** Whole breaths in a session. Sessions are whole breaths, so this is exact. */
export function breathCount(durationMs: number, technique: Pick<Technique, 'phases'>): number {
  return Math.max(1, Math.round(durationMs / cycleMs(technique)));
}

export function nowText(snapshot: BreathSnapshot, context: ViewContext): NowText {
  const { technique, durationMs, preview } = context;
  switch (snapshot.status) {
    case 'ready':
      return { word: 'Ready', hint: 'Press start, then follow the dot', count: null, kind: 'ready' };
    case 'complete':
      if (preview) {
        return { word: 'Preview over', hint: `${technique.name} is part of the lifetime unlock.`, count: null, kind: 'done' };
      }
      return {
        word: 'Session complete',
        hint: `${breathCount(durationMs, technique)} breaths in ${formatClock(durationMs)}.`,
        count: null,
        kind: 'done',
      };
    case 'paused':
      return { word: snapshot.word, hint: 'Paused', count: String(snapshot.secondsLeft), kind: kindOf(snapshot, technique) };
    case 'running':
      return { word: snapshot.word, hint: snapshot.hint, count: String(snapshot.secondsLeft), kind: kindOf(snapshot, technique) };
  }
}

function kindOf(snapshot: BreathSnapshot, technique: Technique): PhaseKind {
  return technique.phases[snapshot.phaseIndex]?.kind ?? 'in';
}

/** The words for the big button. */
export function startLabel(status: BreathSnapshot['status']): 'Start' | 'Pause' | 'Resume' | 'Again' {
  if (status === 'running') return 'Pause';
  if (status === 'paused') return 'Resume';
  if (status === 'complete') return 'Again';
  return 'Start';
}

/** The line under the technique name. */
export function noteText(technique: Technique, preview: boolean): string {
  return preview ? `1 minute preview. ${technique.name} is part of the lifetime unlock.` : technique.wording;
}

/** The value on the length button: "5 min", or "1 min preview". */
export function lengthLabel(minutes: number, preview: boolean): string {
  return preview ? '1 min preview' : `${minutes} min`;
}
