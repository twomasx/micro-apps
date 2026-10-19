// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBackToClose } from './useBackToClose';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Probe({ open, name, onClose }: { open: boolean; name: string; onClose: () => void }) {
  useBackToClose(open, onClose, name);
  return null;
}

const onSheetEntry = () => (window.history.state as { focusSheet?: boolean } | null)?.focusSheet === true;

/** Back, as the Android button does it: the entry goes, then popstate fires. */
function back() {
  window.history.replaceState(null, '');
  window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
}

let root: Root;
beforeEach(() => {
  window.history.replaceState(null, '');
  root = createRoot(document.createElement('div'));
});
afterEach(() => act(() => root.unmount()));

describe('useBackToClose', () => {
  it('adds a history entry while open, and Back closes', () => {
    const onClose = vi.fn();
    act(() => root.render(<Probe open name="sound" onClose={onClose} />));
    expect(onSheetEntry()).toBe(true);
    act(back);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('adds the entry again when Back closes one sheet and another takes its place', () => {
    const onClose = vi.fn();
    act(() => root.render(<Probe open name="sound" onClose={onClose} />));
    act(back);
    // The parent shows the next sheet (the preview offer) without closing the dialog.
    act(() => root.render(<Probe open name="preview" onClose={onClose} />));
    expect(onSheetEntry()).toBe(true);
  });
});
