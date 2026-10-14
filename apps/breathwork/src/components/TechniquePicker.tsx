import { useMemo } from 'react';
import { isTechniqueLocked } from '../lib/limits';
import { buildShape, outlinePath } from '../lib/shape';
import type { Phase, Technique } from '../lib/techniques';
import { LockIcon } from './Icons';

/** A small copy of a breathing pattern's shape: the picker, the science page, your week. */
export function MiniShape({ phases }: { phases: readonly Pick<Phase, 'kind' | 'ms'>[] }) {
  const key = phases.map((p) => `${p.kind}${p.ms}`).join(' ');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const d = useMemo(() => outlinePath(buildShape(phases), 3), [key]);
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
            <MiniShape phases={technique.phases} />
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
