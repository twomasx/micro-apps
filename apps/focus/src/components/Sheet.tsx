import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { useBackToClose } from '../hooks/useBackToClose';
import { CloseIcon } from './Icons';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** Names the sheet for screen readers and is shown as its heading. */
  title: string;
  /** Which sheet this is, for styling. */
  name: string;
  children: ReactNode;
}

/**
 * A panel that slides up from the bottom on a phone and sits in the middle on larger screens.
 * It is a native dialog: focus stays inside it and Escape closes it. Back closes it too.
 */
export function Sheet({ open, onClose, title, name, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useBackToClose(open, onClose, name);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // Start on the heading, so a screen reader reads it and no button looks selected.
      dialog.querySelector<HTMLElement>('.sheet-title')?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const onBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <dialog
      ref={ref}
      className="sheet"
      data-sheet={name}
      aria-labelledby="sheet-title"
      onClick={onBackdrop}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {open && (
        <div className="sheet-body">
          <header className="sheet-head">
            <h2 id="sheet-title" className="sheet-title" tabIndex={-1}>
              {title}
            </h2>
            <button type="button" className="icon-button sheet-close" aria-label="Close" onClick={onClose}>
              <CloseIcon />
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  );
}
