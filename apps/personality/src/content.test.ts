import { describe, expect, it } from 'vitest';
import { CONTENT } from '../server/content.generated.ts';
import { parseContent, wordCount } from './lib/content.ts';
import { bigFiveQuestions } from './lib/big-five-test.ts';
import { currentQuestions } from './lib/questions.ts';

const files = import.meta.glob<string>('../content/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

function read(path: string): string {
  const text = files[`../content/${path}`];
  if (text === undefined) throw new Error(`Missing content file: ${path}`);
  return text;
}

const axes = currentQuestions.axes;
const traits = bigFiveQuestions.axes;
const aspects = traits.flatMap((trait) => trait.aspects);
const TYPE_CODES = ['E', 'I'].flatMap((ei) =>
  ['S', 'N'].flatMap((sn) => ['T', 'F'].flatMap((tf) => ['J', 'P'].map((jp) => ei + sn + tf + jp))),
);
const TYPE_SECTIONS = [
  'Summary',
  'Strengths',
  'Blind spots',
  'At work',
  'Under stress',
  'How others may read you',
];

// Root and app CLAUDE.md: wording we never ship.
const BANNED: [string, RegExp][] = [
  ['em or en dash', /[–—]/],
  ['exclamation mark', /!/],
  ['emoji', /\p{Extended_Pictographic}/u],
  ['trademarked test name', /myers|mbti/i],
  [
    'type nickname from another test',
    /\b(architect|logician|commander|debater|advocate|mediator|protagonist|campaigner|logistician|defender|executive|consul|virtuoso|adventurer|entrepreneur|entertainer)\b/i,
  ],
  [
    'claim we do not make',
    /rewires?|brainwaves?|\btreats?\b|\bcures?\b|clinically proven|scientifically accurate/i,
  ],
];

describe('parseContent', () => {
  it('reads status, title and sections', () => {
    const parsed = parseContent('status: approved\n\n# Title\n\n## One\n\nFirst.\n\n## Two\n\nSecond.\n');
    expect(parsed).toEqual({
      status: 'approved',
      title: 'Title',
      sections: { One: 'First.', Two: 'Second.' },
    });
  });

  it('throws without a status line', () => {
    expect(() => parseContent('# Title\n')).toThrow();
  });

  it('throws on a repeated section', () => {
    expect(() => parseContent('status: draft\n# T\n## A\nx\n## A\ny\n')).toThrow();
  });
});

describe('content files', () => {
  it('match the generated server module (run `pnpm content` after editing content/)', () => {
    const fromDisk = Object.fromEntries(
      Object.entries(files).map(([path, text]) => [
        path.replace('../content/', ''),
        text.replace(/\r\n/g, '\n'),
      ]),
    );
    expect(CONTENT).toEqual(fromDisk);
  });

  it('has the 46 expected files and no others', () => {
    const expected = [
      ...TYPE_CODES.map((code) => `types/${code}.md`),
      ...axes.flatMap((axis) => [`axes/${axis.id}.md`, `pairs/${axis.id}.md`]),
      ...traits.flatMap((trait) => [`big-five/traits/${trait.id}.md`, `big-five/pairs/${trait.id}.md`]),
      ...aspects.map((aspect) => `big-five/aspects/${aspect.id}.md`),
      'science.md',
      'privacy.md',
    ];
    const found = Object.keys(files).map((path) => path.replace('../content/', ''));
    expect(found.sort()).toEqual(expected.sort());
  });

  it.each(Object.keys(files))('%s parses and uses no banned wording', (path) => {
    const text = files[path] ?? '';
    expect(() => parseContent(text)).not.toThrow();
    for (const [name, pattern] of BANNED) {
      expect(pattern.exec(text)?.[0], name).toBeUndefined();
    }
  });

  it.each(TYPE_CODES)('types/%s.md has every section and a summary of about 80 words', (code) => {
    const parsed = parseContent(read(`types/${code}.md`));
    expect(parsed.title).toBe(code);
    expect(Object.keys(parsed.sections)).toEqual(TYPE_SECTIONS);
    for (const body of Object.values(parsed.sections)) expect(body).not.toBe('');
    const words = wordCount(parsed.sections.Summary ?? '');
    expect(words).toBeGreaterThanOrEqual(65);
    expect(words).toBeLessThanOrEqual(95);
  });

  it.each(axes)('axes/$id.md covers both sides, the middle and the Big Five trait', (axis) => {
    const { sections } = parseContent(read(`axes/${axis.id}.md`));
    expect(Object.keys(sections)).toEqual([
      'What this scale measures',
      `Leaning ${axis.left.letter}`,
      `Leaning ${axis.right.letter}`,
      'Near the middle',
      'Big Five',
    ]);
    expect(sections['Big Five']).toContain(axis.bigFive);
  });

  it.each(axes)('pairs/$id.md covers alike, different and questions', (axis) => {
    const { sections } = parseContent(read(`pairs/${axis.id}.md`));
    expect(Object.keys(sections)).toEqual([
      `Both ${axis.left.letter}`,
      `Both ${axis.right.letter}`,
      `One ${axis.left.letter}, one ${axis.right.letter}`,
      'Questions to talk through',
    ]);
  });

  it.each(traits)('big-five/traits/$id.md has every band, short and in depth', (trait) => {
    const { title, sections } = parseContent(read(`big-five/traits/${trait.id}.md`));
    expect(title).toBe(trait.name);
    expect(Object.keys(sections)).toEqual([
      'What this trait measures',
      'Higher',
      'Middle',
      'Lower',
      'Higher in depth',
      'Middle in depth',
      'Lower in depth',
    ]);
    for (const band of ['Higher', 'Middle', 'Lower']) {
      expect(wordCount(sections[band] ?? '')).toBeGreaterThanOrEqual(30);
      expect(wordCount(sections[`${band} in depth`] ?? '')).toBeGreaterThanOrEqual(90);
    }
  });

  it.each(aspects)('big-five/aspects/$id.md says what it measures and has both halves', (aspect) => {
    const { title, sections } = parseContent(read(`big-five/aspects/${aspect.id}.md`));
    expect(title).toBe(aspect.name);
    expect(Object.keys(sections)).toEqual(['What this aspect measures', 'Higher', 'Lower']);
  });

  it.each(traits)('big-five/pairs/$id.md covers alike, different and questions', (trait) => {
    const { sections } = parseContent(read(`big-five/pairs/${trait.id}.md`));
    expect(Object.keys(sections)).toEqual(['Alike', 'Different', 'Questions to talk through']);
  });

  it('never compares a Big Five score with other people: there are no norms yet', () => {
    for (const [path, text] of Object.entries(files)) {
      if (!path.includes('big-five/')) continue;
      expect(/than (most|other) people|above average|below average|average person/i.exec(text)?.[0], path).toBeUndefined();
    }
  });
});
