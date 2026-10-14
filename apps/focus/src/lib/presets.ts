import data from '../data/presets.json';

export const EVIDENCE_LABELS = ['Some research', 'Mixed results', 'Little research'] as const;
export type EvidenceLabel = (typeof EVIDENCE_LABELS)[number];

export interface Source {
  authors: string;
  year: number;
  title: string;
  journal: string;
  url: string;
  /** What the study found, in plain words. */
  finding: string;
}

export interface Preset {
  id: string;
  name: string;
  /** Short name for the preset row. */
  short: string;
  /** Beat rate in Hz: the difference between the two ears. */
  beat: number;
  /** Left ear frequency in Hz. */
  carrier: number;
  wording: string;
  /** Free presets play at full length without the lifetime unlock. */
  free: boolean;
  /** null until the research for this preset is approved. */
  evidence: EvidenceLabel | null;
  /** A caveat about how close the studies are to this preset, or null. */
  evidenceNote: string | null;
  sources: Source[];
}

function toLabel(value: string | null): EvidenceLabel | null {
  return EVIDENCE_LABELS.find((label) => label === value) ?? null;
}

/**
 * The research as written in presets.json, whether or not it is approved.
 * Use this only to review it. The app shows `presets`.
 */
export const proposedPresets: readonly Preset[] = data.presets.map((preset) => ({
  ...preset,
  evidence: toLabel(preset.evidence),
}));

/** The presets the app shows. Evidence stays hidden until `evidenceApproved` is true in presets.json. */
export const presets: readonly Preset[] = data.evidenceApproved
  ? proposedPresets
  : proposedPresets.map((preset) => ({ ...preset, evidence: null, evidenceNote: null, sources: [] }));

export function findPreset(id: string): Preset | undefined {
  return presets.find((preset) => preset.id === id);
}
