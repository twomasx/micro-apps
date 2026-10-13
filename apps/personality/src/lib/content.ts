export type ContentStatus = 'draft' | 'approved';

export interface ContentFile {
  /** Roger changes `draft` to `approved` after review. */
  status: ContentStatus;
  title: string;
  /** Text under each `## heading`, keyed by the heading. */
  sections: Record<string, string>;
}

/**
 * Reads one file from `content/`: a `status:` line, a `# title`, then `## sections`.
 * Shared by client and server, so no DOM or Workers APIs here.
 */
export function parseContent(markdown: string): ContentFile {
  const lines = markdown.split(/\r?\n/);
  const status = /^status: (draft|approved)$/.exec(lines[0] ?? '')?.[1];
  if (status !== 'draft' && status !== 'approved') {
    throw new Error('Content must start with "status: draft" or "status: approved"');
  }

  let title: string | null = null;
  let heading: string | null = null;
  const bodies = new Map<string, string[]>();
  for (const line of lines.slice(1)) {
    if (line.startsWith('## ')) {
      heading = line.slice(3).trim();
      if (bodies.has(heading)) throw new Error(`Duplicate section: ${heading}`);
      bodies.set(heading, []);
    } else if (line.startsWith('# ')) {
      if (title !== null) throw new Error('Content has more than one title');
      title = line.slice(2).trim();
    } else if (heading !== null) {
      bodies.get(heading)?.push(line);
    } else if (line.trim() !== '') {
      throw new Error(`Text outside a section: ${line}`);
    }
  }
  if (title === null) throw new Error('Content has no "# title" line');

  const sections: Record<string, string> = {};
  for (const [name, body] of bodies) sections[name] = body.join('\n').trim();
  return { status, title, sections };
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
