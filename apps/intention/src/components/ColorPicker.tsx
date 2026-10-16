import { useId } from 'react';
import { hexToRgb } from '../lib/color.ts';
import { pairFor } from '../lib/color-settings.ts';
import { pairCheck } from '../lib/picker.ts';
import { priceLine } from '../lib/products.ts';
import { Link } from './Link.tsx';
import { Sheet } from './Sheet.tsx';

interface Props {
  open: boolean;
  /** Without Lab Pass the sheet says what the picker does and what it costs, instead of the picker. */
  locked: boolean;
  left: string;
  right: string;
  onChange: (left: string, right: string) => void;
  onApply: () => void;
  onClose: () => void;
}

/** Pick any two colors. The field behind updates as you pick; Close puts the old pair back. */
export function ColorPicker({ open, locked, left, right, onChange, onApply, onClose }: Props) {
  const id = useId();
  if (locked) {
    return (
      <Sheet open={open} onClose={onClose} title="Pick your two colors" name="picker">
        <div className="picker picker-locked">
          <p>Use any two colors you like, not just the presets. This comes with Lab Pass.</p>
          <p className="price">{priceLine()}</p>
          {/* The sheet has its own history entry, so the link replaces it. */}
          <Link to="unlock" replace className="picker-apply">
            See Lab Pass
          </Link>
        </div>
      </Sheet>
    );
  }
  const pair = pairFor({ kind: 'custom', left, right });
  const check = pairCheck(hexToRgb(left), hexToRgb(right));
  return (
    <Sheet open={open} onClose={onClose} title="Pick your two colors" name="picker">
      <div className="picker">
        <div className="picker-row">
          <label className="picker-color" htmlFor={`${id}-left`}>
            <span>Left</span>
            <input id={`${id}-left`} type="color" value={left} onChange={(e) => onChange(e.target.value, right)} />
            <b>{pair.left.name}</b>
          </label>
          <label className="picker-color" htmlFor={`${id}-right`}>
            <span>Right</span>
            <input id={`${id}-right`} type="color" value={right} onChange={(e) => onChange(left, e.target.value)} />
            <b>{pair.right.name}</b>
          </label>
        </div>
        {check.notes.map((note) => (
          <p key={note} className="picker-note" data-level={check.level}>
            {note}
          </p>
        ))}
        <button type="button" className="picker-apply" onClick={onApply}>
          Use these
        </button>
      </div>
    </Sheet>
  );
}
