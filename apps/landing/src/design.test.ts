// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { appConfig } from '../app.config.ts';
import { compileDesignBoot } from './design-boot.ts';
import {
  DEFAULT_DESIGN,
  DESIGN_NAMES,
  DESIGNS,
  designLabel,
  nextDesign,
  parseDesign,
  pickDesign,
  readStored,
  STORAGE_KEY,
  writeStored,
} from './design.ts';

describe('design switcher', () => {
  it('cycles a, b, c, then a again', () => {
    expect(nextDesign('a')).toBe('b');
    expect(nextDesign('b')).toBe('c');
    expect(nextDesign('c')).toBe('a');
    let design = DEFAULT_DESIGN;
    for (let i = 0; i < DESIGNS.length; i++) design = nextDesign(design);
    expect(design).toBe(DEFAULT_DESIGN);
  });

  it('reads a design letter and nothing else', () => {
    expect(parseDesign('a')).toBe('a');
    expect(parseDesign('C')).toBe('c');
    expect(parseDesign(' b ')).toBe('b');
    for (const bad of ['', 'd', 'ab', '1', 'spectrum', null, undefined, 2]) expect(parseDesign(bad)).toBeNull();
  });

  it('prefers the address, then the saved choice, then design a', () => {
    expect(pickDesign('?design=c', 'b')).toBe('c');
    expect(pickDesign('?design=B&x=1', null)).toBe('b');
    expect(pickDesign('', 'b')).toBe('b');
    expect(pickDesign('?design=z', 'c')).toBe('c');
    expect(pickDesign('?design=z', 'nonsense')).toBe('a');
    expect(pickDesign('', null)).toBe('a');
    expect(DEFAULT_DESIGN).toBe('a');
  });

  it('labels each design by its place and name', () => {
    expect(DESIGNS.map(designLabel)).toEqual(['Design 1 of 3', 'Design 2 of 3', 'Design 3 of 3']);
    for (const design of DESIGNS) expect(DESIGN_NAMES[design]).toMatch(/^[A-Z][a-z]+( [A-Z][a-z]+)?$/);
  });

  it('saves under a key that starts with the app name', () => {
    expect(STORAGE_KEY).toBe(`${appConfig.name}:design`);
  });

  it('works when storage is missing or throws', () => {
    const blocked = (): Storage => {
      throw new Error('SecurityError');
    };
    expect(readStored(blocked)).toBeNull();
    expect(() => writeStored(blocked, 'b')).not.toThrow();

    const full = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } } as unknown as Storage;
    expect(() => writeStored(() => full, 'c')).not.toThrow();
  });

  it('saves and reads back a choice', () => {
    const data = new Map<string, string>();
    const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) } as unknown as Storage;
    writeStored(() => storage, 'c');
    expect(data.get('landing:design')).toBe('c');
    expect(readStored(() => storage)).toBe('c');
  });
});

describe('the boot script', () => {
  /** Just enough of a browser to run the compiled script. */
  function fakeWindow(search: string, stored: string | null, throwing = false) {
    const attributes = new Map<string, string>();
    const theme = new Map<string, string>();
    const saved = new Map<string, string>();
    if (stored !== null) saved.set('landing:design', stored);
    const storage = {
      getItem: (k: string) => saved.get(k) ?? null,
      setItem: (k: string, v: string) => void saved.set(k, v),
    };
    const win = {
      location: { search, href: `https://polymadlabs.com/${search}` },
      get localStorage() {
        if (throwing) throw new Error('SecurityError');
        return storage;
      },
      document: {
        readyState: 'loading',
        documentElement: { setAttribute: (k: string, v: string) => void attributes.set(k, v) },
        querySelector: (selector: string) =>
          selector === 'meta[name="theme-color"]' ? { setAttribute: (k: string, v: string) => void theme.set(k, v) } : null,
        addEventListener: () => {},
      },
    };
    return { win, attributes, theme, saved };
  }

  const run = async (win: unknown) => {
    const code = await compileDesignBoot();
    new Function('window', code)(win);
  };

  it('is a plain script: no import or export left', async () => {
    const code = await compileDesignBoot();
    expect(code).not.toMatch(/\bimport\b|\bexport\b/);
    expect(code.length).toBeLessThan(3000);
  });

  it('applies the saved design before the page is drawn', async () => {
    const { win, attributes, theme } = fakeWindow('', 'c');
    await run(win);
    expect(attributes.get('data-design')).toBe('c');
    expect(attributes.has('data-switcher')).toBe(true);
    expect(theme.get('content')).toBe('#f1ece2');
  });

  it('applies and saves the design named in the address', async () => {
    const { win, attributes, saved } = fakeWindow('?design=b', 'c');
    await run(win);
    expect(attributes.get('data-design')).toBe('b');
    expect(saved.get('landing:design')).toBe('b');
  });

  it('falls back to design a when storage is blocked', async () => {
    const { win, attributes } = fakeWindow('', null, true);
    await run(win);
    expect(attributes.get('data-design')).toBe('a');
  });
});
