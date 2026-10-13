import { describe, expect, it } from 'vitest';
import { proseBlocks } from './prose.ts';

describe('proseBlocks', () => {
  it('reads paragraphs and lists', () => {
    expect(proseBlocks('One line\nsame paragraph.\n\n- first\n- second\n\nLast.')).toEqual([
      { type: 'paragraph', text: 'One line same paragraph.' },
      { type: 'list', items: ['first', 'second'] },
      { type: 'paragraph', text: 'Last.' },
    ]);
  });
});
