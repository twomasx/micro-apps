import { useMemo } from 'react';
import { isTechniqueLocked } from '../lib/limits';
import { buildShape, outlinePath } from '../lib/shape';
import type { Technique } from '../lib/techniques';
import { LockIcon } from './Icons';

/** A small copy of a technique's shape, for the picker. */
export function MiniShape({ technique }: { technique: Technique }) {
  const d = useMemo(() => outlinePath(buildShape(technique.phases), 3), [technique]);
  return (
    <svg className="mini-shape" viewBox="-0.15 -0.15 1.3 1.3" aria-hidden="true" focusable="false">
      <path d={d} />
    </svg>
  );
}

interface PickerProps {
  techniques: readonly Technique[];
  selectedId: string;
  unlocked: boolean;
  onSelect: (technique: Technique) => void;
}

/** One button per technique, in thumb reach. Keys 1 to 4 do the same. */
export function TechniquePicker({ techniques, selectedId, unlocked, onSelect }: PickerProps) {
  return (
    <div className="picker" role="group" aria-label="Technique">
      {techniques.map((technique, i) => {
        const locked = isTechniqueLocked(technique, unlocked);
        return (
          <button
            key={technique.id}
            type="button"
            className="picker-option"
            aria-pressed={technique.id === selectedId}
            aria-keyshortcuts={String(i + 1)}
            data-locked={locked || undefined}
            onClick={() => onSelect(technique)}
          >
            <MiniShape technique={technique} />
            <span className="picker-name">
              {technique.short}
              {locked && <LockIcon />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
