import { describe, expect, it } from 'vitest';
import { experiments, protocol, studySheet } from './content.ts';
import { renderPage } from './render.ts';
import { STILL_FRAME } from './motion.ts';
import { specimens } from './specimens/index.ts';
import { techniques, fit } from './specimens/breathwork.ts';
import source from '../index.html?raw';

const html = renderPage(source);
/** The words a visitor reads: tags, specimen drawings and attributes removed. */
const text = html
  .replace(/<svg[\s\S]*?<\/svg>/g, ' ')
  .replace(/<script[\s\S]*?<\/script>/g, ' ')
  .replace(/<[^>]+>/g, ' ');

const BANNED = [
  'rewires your brain',
  'rewire',
  'syncs your brainwaves',
  'treats',
  'cures',
  'clinically proven',
  'scientifically accurate',
  'proves that',
  'psychic',
];

describe('copy', () => {
  const lines = [
    text,
    ...experiments.flatMap((e) => [e.youDo, e.youGet]),
    ...protocol.flatMap((s) => [s.title, s.text]),
    ...studySheet.flat(),
  ];

  it('has no em dashes, en dashes or exclamation marks', () => {
    for (const line of lines) expect(line).not.toMatch(/[—–!]/);
  });

  it('makes none of the banned claims', () => {
    const lower = text.toLowerCase();
    for (const phrase of BANNED) expect(lower).not.toContain(phrase);
  });

  it('has no emoji', () => {
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it('counts the experiments it lists', () => {
    expect(text).toContain(`${experiments.length} entries`);
    expect(studySheet).toContainEqual(['Experiments', String(experiments.length)]);
  });

  it('never says Intention lets you pick your color, because the server picks it', () => {
    const intention = experiments.find((e) => e.id === 'intention')!;
    expect(intention.youDo).toMatch(/at random/);
    expect(intention.youDo.toLowerCase()).not.toContain('pick a color');
  });

  it('keeps prices off the page, so they cannot drift from each app’s products.json', () => {
    expect(text).not.toMatch(/\$\d/);
  });
});

describe('page', () => {
  it('fills every marker', () => {
    expect(html).not.toContain('<!-- render:');
  });

  it('lists the five apps in order, each with an Open link and a footer link', () => {
    const order = experiments.map((e) => e.path);
    expect(order).toEqual(['/personality/', '/focus/', '/breathwork/', '/attention/', '/intention/']);
    for (const e of experiments) {
      expect(html).toContain(`<a class="entry-open" href="${e.path}">Open<span class="visually-hidden"> ${e.name}</span>`);
      expect(html).toContain(`<li><a href="${e.path}">${e.name}</a></li>`);
    }
  });

  it('has one line about the all-app pass, linking to it, with no price', () => {
    expect(html).toContain('<p class="protocol-pass">One pass unlocks every app, including the ones we add later. <a href="/pass/">See the PolymadLabs pass</a></p>');
  });

  it('has one h1, then h2 sections, then h3 entries', () => {
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
    levels.forEach((level, i) => {
      if (i > 0) expect(level - levels[i - 1]!).toBeLessThanOrEqual(1);
    });
  });

  it('has link preview tags with absolute URLs', () => {
    expect(html).toContain('<meta property="og:image" content="https://polymadlabs.com/_landing/og.png" />');
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
    expect(html).toContain('viewport-fit=cover');
  });

  it('has WebSite and Organization structured data, with the 512 px logo', () => {
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]!) as Record<string, unknown>);
    expect(blocks.map((b) => b['@type'])).toEqual(['WebSite', 'Organization']);
    expect(blocks[1]).toMatchObject({ name: 'PolymadLabs', url: 'https://polymadlabs.com/', logo: 'https://polymadlabs.com/_landing/logo-512.png' });
  });

  it('loads nothing from other sites', () => {
    const urls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]!);
    // Absolute URLs are only our own address, for link previews and the canonical link.
    for (const url of urls.filter((u) => !u.startsWith('https://polymadlabs.com/'))) {
      expect(url).not.toMatch(/^(https?:)?\/\//);
    }
  });
});

describe('specimens', () => {
  it.each(experiments.map((e) => e.id))('%s is a decorative SVG with its own ids', (id) => {
    const svg = specimens[id]();
    expect(svg).toMatch(/^<svg class="specimen-art" data-specimen="[a-z]+" viewBox="0 0 120 80"[^>]*aria-hidden="true"/);
    expect(svg).toContain(`data-specimen="${id}"`);
    expect(STILL_FRAME[id]).toBeTypeOf('number');
  });

  it('hides each whole specimen from screen readers, so a row is announced by its app name', () => {
    for (const e of experiments) expect(html).toContain(`<figure class="specimen" data-app="${e.id}" aria-hidden="true">`);
  });

  it('never repeats an id across the page', () => {
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('draws the same picture every build', () => {
    for (const e of experiments) expect(specimens[e.id]()).toBe(specimens[e.id]());
  });

  it('never repeats a keyTime, which some browsers reject', () => {
    for (const e of experiments) {
      for (const match of specimens[e.id]().matchAll(/keyTimes="([^"]+)"/g)) {
        const times = match[1]!.split(';').map(Number);
        expect(times[0]).toBe(0);
        expect(times.at(-1)).toBe(1);
        times.slice(1).forEach((t, i) => expect(t).toBeGreaterThan(times[i]!));
      }
    }
  });
});

describe('breathwork shapes', () => {
  const sideLengths = (outline: { x: number; y: number }[]) =>
    outline.slice(1).map((p, i) => Math.hypot(p.x - outline[i]!.x, p.y - outline[i]!.y));

  it('box is a square', () => {
    const box = techniques.find((t) => t.id === 'box')!;
    const sides = sideLengths(box.outline);
    for (const side of sides) expect(side).toBeCloseTo(4, 6);
  });

  it('4-7-8 keeps each side as long as its seconds', () => {
    const shape = techniques.find((t) => t.id === '478')!;
    const [up, across, down] = sideLengths(shape.outline);
    expect(up).toBeCloseTo(4, 4);
    expect(across).toBeCloseTo(7, 4);
    expect(down).toBeCloseTo(8, 4);
  });

  it('the cyclic sigh breathes out along a curve 6 s long', () => {
    const sigh = techniques.find((t) => t.id === 'sigh')!;
    const sides = sideLengths(sigh.outline);
    expect(sides[0]).toBeCloseTo(2, 6);
    expect(sides[1]).toBeCloseTo(1, 6);
    expect(sides.slice(2).reduce((a, b) => a + b, 0)).toBeCloseTo(6, 2);
  });

  it('fits every shape inside the specimen', () => {
    for (const t of techniques) {
      for (const p of fit(t.outline, 54)) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(120);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(80);
      }
    }
  });
});
