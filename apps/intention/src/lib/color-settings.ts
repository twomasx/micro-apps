import { createStorage, storageKey } from '@micro/platform';
import { appConfig } from '../../app.config.ts';
import { hexToRgb, isHex } from './color.ts';
import { pairNames } from './color-names.ts';
import { DEFAULT_PAIR, PRESET_PAIRS, type ColorPair } from './pairs.ts';

/** Which colors the tug uses on this device. */
export type ColorChoice = { kind: 'preset'; id: string } | { kind: 'custom'; left: string; right: string };

export const DEFAULT_CHOICE: ColorChoice = { kind: 'preset', id: DEFAULT_PAIR.id };
export const CUSTOM_ID = 'custom';

/** Anything read back from storage, made safe. Unknown or broken values fall back to the default pair. */
export function sanitizeChoice(value: unknown): ColorChoice {
  if (typeof value !== 'object' || value === null) return DEFAULT_CHOICE;
  const v = value as Record<string, unknown>;
  if (v.kind === 'preset' && typeof v.id === 'string' && PRESET_PAIRS.some((p) => p.id === v.id)) {
    return { kind: 'preset', id: v.id };
  }
  if (v.kind === 'custom' && typeof v.left === 'string' && typeof v.right === 'string' && isHex(v.left) && isHex(v.right)) {
    return { kind: 'custom', left: v.left.toLowerCase(), right: v.right.toLowerCase() };
  }
  return DEFAULT_CHOICE;
}

/** The pair a choice stands for. Custom colors get plain names, never the same two. */
export function pairFor(choice: ColorChoice): ColorPair {
  if (choice.kind === 'preset') return PRESET_PAIRS.find((p) => p.id === choice.id) ?? DEFAULT_PAIR;
  const [leftName, rightName] = pairNames(hexToRgb(choice.left), hexToRgb(choice.right));
  return {
    id: CUSTOM_ID,
    left: { name: leftName, hex: choice.left },
    right: { name: rightName, hex: choice.right },
  };
}

// IndexedDB can be missing or blocked (some private modes). The colors then last for this visit.
const storage = createStorage(appConfig.name);
const COLORS_KEY = storageKey(appConfig.name, 'colors');

export async function loadColorChoice(): Promise<ColorChoice> {
  try {
    return sanitizeChoice(await storage.get<unknown>(COLORS_KEY));
  } catch {
    return DEFAULT_CHOICE;
  }
}

export async function saveColorChoice(choice: ColorChoice): Promise<void> {
  try {
    await storage.set(COLORS_KEY, choice);
  } catch {
    // Kept for this visit.
  }
}
