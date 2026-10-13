export type ProseBlock = { type: 'paragraph'; text: string } | { type: 'list'; items: string[] };

/** Splits a content section into paragraphs and "- " lists. */
export function proseBlocks(body: string): ProseBlock[] {
  const blocks: ProseBlock[] = [];
  for (const chunk of body.split(/\n\s*\n/)) {
    const lines = chunk
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;
    if (lines.every((line) => line.startsWith('- '))) {
      blocks.push({ type: 'list', items: lines.map((line) => line.slice(2).trim()) });
    } else {
      blocks.push({ type: 'paragraph', text: lines.join(' ') });
    }
  }
  return blocks;
}
