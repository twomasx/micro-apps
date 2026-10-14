import data from '../data/presets.json';

export type EvidenceLabel = 'Some research' | 'Mixed results' | 'Little research';

export interface Source {
  title: string;
  url: string;
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
  /** null until the research for this preset is done and approved. */
  evidence: EvidenceLabel | null;
  sources: Source[];
}

export const presets: readonly Preset[] = data.presets;

export function findPreset(id: string): Preset | undefined {
  return presets.find((preset) => preset.id === id);
}
