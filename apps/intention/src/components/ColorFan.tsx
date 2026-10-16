import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useBackToClose } from '../hooks/useBackToClose.ts';
import { CUSTOM_ID } from '../lib/color-settings.ts';
import { fanRadius, fanSpots, swatchSize, type FanSpot } from '../lib/fan.ts';
import { pairName, PRESET_PAIRS, type ColorPair } from '../lib/pairs.ts';

interface Props {
  open: boolean;
  pair: ColorPair;
  /** Hidden during a run: colors cannot change while bits are counted. */
  hidden: boolean;
  /** Your own colors come with Lab Pass. The "+" still opens, to say so. */
  customLocked: boolean;
  onOpenChange: (open: boolean) => void;
  onPickPreset: (id: string) => void;
  onPickCustom: () => void;
}

const COUNT = PRESET_PAIRS.length + 1;

/**
 * The color dot and its fan. Tapping the dot fans the pairs out in an arc with a slight bounce; the last
 * swatch, "+", opens the picker for any two colors. Tapping outside, Escape and Android Back fold it.
 */
export function ColorFan({ open, pair, hidden, customLocked, onOpenChange, onPickPreset, onPickCustom }: Props) {
  const dotRef = useRef<HTMLButtonElement>(null);
  const fanRef = useRef<HTMLDivElement>(null);
  // Measured each time the fan opens, so it fits the room left of the dot on any screen.
  const [layout, setLayout] = useState(() => layoutFor(Number.POSITIVE_INFINITY));
  const close = () => onOpenChange(false);
  const toggle = () => {
    if (!open && dotRef.current) {
      const rect = dotRef.current.getBoundingClientRect();
      setLayout(layoutFor(rect.left + rect.width / 2));
    }
    onOpenChange(!open);
  };
  useBackToClose(open, close);

  useEffect(() => {
    if (!open) return;
    const current = fanRef.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
    (current ?? fanRef.current?.querySelector<HTMLButtonElement>('button'))?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onOpenChange(false);
      dotRef.current?.focus({ preventScroll: true });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  if (hidden) return null;

  return (
    <div className="fan-anchor" data-open={open}>
      <div
        ref={fanRef}
        className="fan"
        role="group"
        aria-label="Color pairs"
        inert={!open}
        style={{ '--swatch': `${layout.size}px` } as CSSProperties}
      >
        {PRESET_PAIRS.map((preset, i) => (
          <button
            key={preset.id}
            type="button"
            className="swatch"
            aria-label={pairName(preset)}
            aria-pressed={preset.id === pair.id}
            data-selected={preset.id === pair.id}
            style={swatchStyle(layout.spots, i, open, { '--sw-left': preset.left.hex, '--sw-right': preset.right.hex })}
            onClick={() => onPickPreset(preset.id)}
          />
        ))}
        <button
          type="button"
          className="swatch swatch-custom"
          aria-label={customLocked ? 'Pick your own two colors, with Lab Pass' : 'Pick your own two colors'}
          aria-pressed={pair.id === CUSTOM_ID}
          data-selected={pair.id === CUSTOM_ID}
          data-locked={customLocked}
          style={swatchStyle(layout.spots, COUNT - 1, open, {})}
          onClick={onPickCustom}
        >
          <span aria-hidden="true">+</span>
        </button>
        <p className="fan-name" aria-live="polite">
          {pairName(pair)}
        </p>
      </div>
      <button
        ref={dotRef}
        type="button"
        className="tug-colors"
        aria-label={`Colors: ${pairName(pair)}`}
        aria-expanded={open}
        onClick={toggle}
      />
    </div>
  );
}

function layoutFor(room: number): { spots: FanSpot[]; size: number } {
  const radius = fanRadius(COUNT, room);
  return { spots: fanSpots(COUNT, radius), size: swatchSize(COUNT, radius) };
}

/** Where a swatch sits, and its place in the open and close order (outer swatches lead on the way out). */
function swatchStyle(spots: readonly FanSpot[], i: number, open: boolean, colors: Record<string, string>): CSSProperties {
  const spot = spots[i]!;
  return {
    ...colors,
    '--x': `${spot.x}px`,
    '--y': `${spot.y}px`,
    '--delay': `${open ? i * 26 : (COUNT - 1 - i) * 14}ms`,
  } as CSSProperties;
}
