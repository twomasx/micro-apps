import { useEffect, useRef } from 'react';

interface Shortcuts {
  /** False while a sheet is open: keys then belong to the sheet. */
  enabled: boolean;
  onToggle: () => void;
  /** 0 for key 1, up to 3 for key 4. */
  onTechnique: (index: number) => void;
}

/** Space starts and pauses. Keys 1 to 4 pick techniques. */
export function useShortcuts(shortcuts: Shortcuts): void {
  const ref = useRef(shortcuts);
  useEffect(() => {
    ref.current = shortcuts;
  });

  useEffect(() => {
    const isSpace = (event: KeyboardEvent) => event.key === ' ' || event.code === 'Space';
    // A control someone reached with the keyboard keeps its own Space behaviour.
    // A button that only has focus because it was clicked does not.
    const ownsSpace = (target: EventTarget | null) =>
      target instanceof Element &&
      (target.matches('input, select, textarea, a') || target.matches('button:focus-visible'));
    const typing = (target: EventTarget | null) =>
      target instanceof Element && target.matches('input:not([type=range]), select, textarea');

    const onKeyDown = (event: KeyboardEvent) => {
      const { enabled, onToggle, onTechnique } = ref.current;
      if (!enabled || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isSpace(event)) {
        if (ownsSpace(event.target)) return;
        event.preventDefault();
        if (!event.repeat) onToggle();
        return;
      }
      if (/^[1-4]$/.test(event.key) && !typing(event.target)) onTechnique(Number(event.key) - 1);
    };
    // Browsers click a focused button when Space is released. Stop that for buttons we handled above.
    const onKeyUp = (event: KeyboardEvent) => {
      if (ref.current.enabled && isSpace(event) && !ownsSpace(event.target)) event.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);
}
