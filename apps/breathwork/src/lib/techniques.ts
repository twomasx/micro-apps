import data from '../data/techniques.json' with { type: 'json' };

/** Breathing in, holding (with full or empty lungs), or breathing out. */
export type PhaseKind = 'in' | 'hold' | 'out';

export interface Phase {
  kind: PhaseKind;
  /** Whole milliseconds, so 5.5 s is exactly 5500 and sums stay exact. */
  ms: number;
  /** The big word on screen: "Inhale", "Hold", "Exhale", or the technique's own. */
  word: string;
  /** The short line under the word, like "Through your nose". */
  hint: string;
}

/** How much research backs a technique. Same three labels as the focus app. */
export type EvidenceLabel = 'Some research' | 'Mixed results' | 'Little research';

export const EVIDENCE_LABELS: readonly EvidenceLabel[] = ['Some research', 'Mixed results', 'Little research'];

export interface Source {
  authors: string;
  year: number;
  title: string;
  journal: string;
  url: string;
  /** What the study found, in plain words. */
  finding: string;
}

export interface Evidence {
  label: EvidenceLabel;
  sources: readonly Source[];
  /** One or two plain sentences on what the sources add up to. */
  note: string;
}

export interface Technique {
  id: string;
  name: string;
  /** Label in the technique picker. */
  short: string;
  free: boolean;
  wording: string;
  phases: readonly Phase[];
  /** Built-in techniques have researched evidence; custom patterns have none. */
  evidence: Evidence | null;
}

export const PHASE_WORDS: Record<PhaseKind, string> = { in: 'Inhale', hold: 'Hold', out: 'Exhale' };

const KINDS: readonly PhaseKind[] = ['in', 'hold', 'out'];

interface RawPhase {
  kind: string;
  seconds: number;
  word?: string;
  hint?: string;
}

interface RawTechnique {
  id: string;
  name: string;
  short: string;
  free: boolean;
  wording: string;
  phases: RawPhase[];
  evidence?: string;
  sources?: Source[];
  evidenceNote?: string;
}

function toEvidence(raw: RawTechnique): Evidence | null {
  if (raw.evidence === undefined) return null;
  const label = EVIDENCE_LABELS.find((l) => l === raw.evidence);
  if (!label) throw new Error(`${raw.id}: unknown evidence label "${raw.evidence}"`);
  const sources = raw.sources ?? [];
  if (sources.length < 1 || sources.length > 3) throw new Error(`${raw.id}: evidence needs 1 to 3 sources`);
  return { label, sources, note: raw.evidenceNote ?? '' };
}

function toPhase(raw: RawPhase, techniqueId: string): Phase {
  const kind = KINDS.find((k) => k === raw.kind);
  if (!kind) throw new Error(`${techniqueId}: unknown phase kind "${raw.kind}"`);
  if (!Number.isFinite(raw.seconds) || raw.seconds <= 0) {
    throw new Error(`${techniqueId}: a phase needs a positive number of seconds`);
  }
  return { kind, ms: Math.round(raw.seconds * 1000), word: raw.word ?? PHASE_WORDS[kind], hint: raw.hint ?? '' };
}

/** Checks one technique from the data file. Throws with a plain message if it is wrong. */
export function toTechnique(raw: RawTechnique): Technique {
  const phases = raw.phases.map((phase) => toPhase(phase, raw.id));
  if (!phases.some((p) => p.kind === 'in') || !phases.some((p) => p.kind === 'out')) {
    throw new Error(`${raw.id}: a technique needs at least one in and one out phase`);
  }
  return {
    id: raw.id,
    name: raw.name,
    short: raw.short,
    free: raw.free,
    wording: raw.wording,
    phases,
    evidence: toEvidence(raw),
  };
}

export const techniques: readonly Technique[] = data.techniques.map(toTechnique);

export function findTechnique(id: string): Technique | undefined {
  return techniques.find((t) => t.id === id);
}

/** One full breath, in milliseconds. */
export function cycleMs(technique: Pick<Technique, 'phases'>): number {
  return technique.phases.reduce((sum, phase) => sum + phase.ms, 0);
}

/** Breaths per minute, like 5.5 for Resonant. */
export function breathsPerMinute(technique: Pick<Technique, 'phases'>): number {
  return 60_000 / cycleMs(technique);
}
