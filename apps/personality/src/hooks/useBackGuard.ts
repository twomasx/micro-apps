import { useCallback, useEffect, useRef } from 'react';

const GUARD = { backGuard: true };

function isGuard(state: unknown): boolean {
  return typeof state === 'object' && state !== null && 'backGuard' in state;
}

/**
 * Lets a screen handle the browser or Android Back button itself.
 *
 * It keeps one extra history entry on top of the page. Back removes that entry
 * and calls `onBack`. If `onBack` returns true the entry is put back and the
 * user stays. If it returns false the user leaves the page as usual.
 *
 * Returns `release`, which removes the extra entry without calling `onBack`.
 * Call it before navigating away so the entry is not left behind.
 */
export function useBackGuard(onBack: () => boolean): () => Promise<void> {
  const onBackRef = useRef(onBack);
  const releasing = useRef<(() => void) | null>(null);

  useEffect(() => {
    onBackRef.current = onBack;
  });

  useEffect(() => {
    if (!isGuard(window.history.state)) {
      window.history.pushState(GUARD, '');
    }
    const onPopState = () => {
      // Arriving on the guard entry (Forward button) is not a Back press.
      if (isGuard(window.history.state)) return;
      if (releasing.current) {
        releasing.current();
        releasing.current = null;
        return;
      }
      if (onBackRef.current()) {
        window.history.pushState(GUARD, '');
      } else {
        window.history.back();
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  return useCallback(
    () =>
      new Promise<void>((resolve) => {
        if (!isGuard(window.history.state)) {
          resolve();
          return;
        }
        releasing.current = resolve;
        window.history.back();
      }),
    [],
  );
}
