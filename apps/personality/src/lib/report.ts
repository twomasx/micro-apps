/** The shapes the report API returns. Types only: the report text itself never ships in the client. */
import type { TraitScore } from './big-five.ts';
import type { SideView } from './result-view.ts';

export interface ReportBlock {
  heading: string;
  /** Plain text. Paragraphs are separated by a blank line. */
  body: string;
}

export interface ReportAxis {
  axis: string;
  /** "Extraversion and Introversion" */
  title: string;
  /** The winning letter. */
  letter: string;
  /** "68% Introversion" */
  headline: string;
  /** "balanced, leans I", or null when the axis is not balanced. */
  balanceLabel: string | null;
  /** Exact position on the scale: 0 is all the way left, 100 all the way right. */
  rightPct: number;
  /** How many questions fed this scale. */
  itemCount: number;
  left: SideView;
  right: SideView;
  blocks: ReportBlock[];
}

export interface Report {
  id: string;
  type: string;
  version: string;
  createdAt: string;
  questionCount: number;
  summary: string;
  axes: ReportAxis[];
  /** The same four scores read as Big Five traits. */
  traits: TraitScore[];
  /** The long type description: strengths, blind spots and so on. */
  sections: ReportBlock[];
}

export function paragraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}
