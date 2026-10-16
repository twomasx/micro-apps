import { useId } from 'react';
import { hexToRgb } from '../lib/color.ts';
import { pairFor } from '../lib/color-settings.ts';
import { pairCheck } from '../lib/picker.ts';
import { Sheet } from './Sheet.tsx';

interface Props {
  open: boolean;
  left: string;
  right: string;
  onChange: (left: string, right: string) => void;
  onApply: () => void;
  onClose: () => void;
}

/** Pick any two colors. The field behind updates as you pick; Close puts the old pair back. */
export function ColorPicker({ open, left, right, onChange, onApply, onClose }: Props) {
  const id = useId();
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
