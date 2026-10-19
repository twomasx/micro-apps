import { useEffect, useRef } from 'react';

const ENTRY = { focusSheet: true };

function onSheetEntry(): boolean {
  const state: unknown = window.history.state;
  return typeof state === 'object' && state !== null && 'focusSheet' in state;
}

/** How many sheets want the history entry right now. Guards against removing it during a quick reopen. */
let holders = 0;

/**
 * While something is open, the browser or Android Back button closes it
 * and the user stays on the page. One history entry is added on open and
 * removed again when it closes another way.
 * `key` names what is open. When it changes while still open (one sheet gives way to another),
 * the entry is added again if Back has just used it up.
 */
export function useBackToClose(open: boolean, onClose: () => void, key?: string): void {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    holders += 1;
    if (!onSheetEntry()) window.history.pushState(ENTRY, '');
    const onPopState = () => {
      if (!onSheetEntry()) onCloseRef.current();
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      holders -= 1;
      // Wait a moment: if it is opened again right away, the entry is reused.
      setTimeout(() => {
        if (holders === 0 && onSheetEntry()) window.history.back();
      }, 0);
    };
  }, [open, key]);
}
