/**
 * The design switcher: three versions of the landing page that Roger cycles through with a button
 * in the top right corner, until he picks one. Temporary: remove this file, the `design-boot` plugin
 * in vite.config.ts and the two unused design stylesheets once a design is chosen.
 *
 * This file runs as a plain (non-module) script in <head>, before the page is drawn, so there is no
 * flash of the wrong design. The page's Content-Security-Policy allows scripts from this site only,
 * so it cannot be inline: vite.config.ts compiles this file into its own small script file.
 * Because of that, this file must not import anything.
 */

export const DESIGNS = ['a', 'b', 'c'] as const;
export type Design = (typeof DESIGNS)[number];

export const DEFAULT_DESIGN: Design = 'a';

export const DESIGN_NAMES: Record<Design, string> = {
  a: 'Spectrum',
  b: 'Observatory',
  c: 'Field Journal',
};

/** The browser's top bar color for each design (meta theme-color). */
export const THEME_COLORS: Record<Design, string> = {
  a: '#f3f1ec',
  b: '#07091a',
  c: '#f1ece2',
};

/** Starts with the app name, like every storage key on polymadlabs.com. */
export const STORAGE_KEY = 'landing:design';
export const QUERY_KEY = 'design';

/** A design letter, or null for anything else. Accepts "B" and " b " too. */
export function parseDesign(value: unknown): Design | null {
  if (typeof value !== 'string') return null;
  const letter = value.trim().toLowerCase();
  return (DESIGNS as readonly string[]).includes(letter) ? (letter as Design) : null;
}

/** The design after this one: a, b, c, then a again. */
export function nextDesign(design: Design): Design {
  return DESIGNS[(DESIGNS.indexOf(design) + 1) % DESIGNS.length]!;
}

/** The design to show: the address (?design=b) first, then the saved choice, then the default. */
export function pickDesign(search: string, stored: string | null): Design {
  return parseDesign(new URLSearchParams(search).get(QUERY_KEY)) ?? parseDesign(stored) ?? DEFAULT_DESIGN;
}

/** "Design 2 of 3" */
export function designLabel(design: Design): string {
  return `Design ${DESIGNS.indexOf(design) + 1} of ${DESIGNS.length}`;
}

/** Storage can be missing, blocked or full (private windows, blocked site data). The page works without it. */
export function readStored(getStorage: () => Storage): string | null {
  try {
    return getStorage().getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeStored(getStorage: () => Storage, design: Design): void {
  try {
    getStorage().setItem(STORAGE_KEY, design);
  } catch {
    // Not saved. The choice still holds until the page is closed.
  }
}

/** Sets the design on <html> and the browser's top bar color. */
export function applyDesign(doc: Document, design: Design): void {
  doc.documentElement.setAttribute('data-design', design);
  doc.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[design]);
}

/** The fixed button in the top right corner, and a status line that announces each change. */
function mountSwitcher(win: Window, start: Design): void {
  const doc = win.document;
  if (doc.querySelector('.design-switcher')) return;
  let current = start;

  const button = doc.createElement('button');
  button.type = 'button';
  button.className = 'design-switcher';
  const count = doc.createElement('span');
  count.className = 'design-switcher-count';
  const name = doc.createElement('span');
  name.className = 'design-switcher-name';
  // A hidden comma, so screen readers say "Design 1 of 3, Spectrum", not "3Spectrum".
  const comma = doc.createElement('span');
  comma.className = 'visually-hidden';
  comma.textContent = ', ';
  button.append(count, comma, name);

  const status = doc.createElement('p');
  status.className = 'visually-hidden';
  status.setAttribute('role', 'status');

  const show = () => {
    count.textContent = designLabel(current);
    name.textContent = DESIGN_NAMES[current];
    button.dataset.current = current;
  };

  button.addEventListener('click', () => {
    current = nextDesign(current);
    applyDesign(doc, current);
    writeStored(() => win.localStorage, current);
    // Keep a shared address in step with the button, so a reload shows the same design.
    try {
      const url = new URL(win.location.href);
      if (url.searchParams.has(QUERY_KEY)) {
        url.searchParams.set(QUERY_KEY, current);
        win.history.replaceState(win.history.state, '', url.href);
      }
    } catch {
      // The address stays as it was.
    }
    show();
    status.textContent = `Showing ${designLabel(current).toLowerCase()}, ${DESIGN_NAMES[current]}.`;
  });

  show();
  // After the skip link, so keyboard users meet the skip link first.
  const skip = doc.querySelector('.skip-link');
  if (skip) skip.after(button, status);
  else doc.body.prepend(button, status);
}

/** Runs once in <head>: picks and applies the design, then adds the button when the page has loaded. */
export function boot(win: Window): Design {
  const doc = win.document;
  const fromAddress = parseDesign(new URLSearchParams(win.location.search).get(QUERY_KEY));
  const design = pickDesign(win.location.search, readStored(() => win.localStorage));
  if (fromAddress) writeStored(() => win.localStorage, fromAddress);
  applyDesign(doc, design);
  doc.documentElement.setAttribute('data-switcher', '');
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', () => mountSwitcher(win, design));
  else mountSwitcher(win, design);
  return design;
}
