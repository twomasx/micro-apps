/** The shapes the report API returns. Types only: the report text itself never ships in the client. */

export interface ReportBlock {
  heading: string;
  /** Plain text. Paragraphs are separated by a blank line. */
  body: string;
}

export interface ReportAxis {
  axis: string;
  /** "Extraversion and Introversion" */
  title: string;
  /** "68% Introversion" */
  headline: string;
  /** "balanced, leans I", or null when the axis is not balanced. */
  balanceLabel: string | null;
  blocks: ReportBlock[];
}

export interface Report {
  id: string;
  type: string;
  summary: string;
  axes: ReportAxis[];
  /** The long type description: strengths, blind spots and so on. */
  sections: ReportBlock[];
}

export function paragraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}
