import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { useBackToClose } from '../hooks/useBackToClose';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  name: string;
  children: ReactNode;
}

/**
 * A panel from the bottom on a phone, in the middle on larger screens. A native dialog:
 * focus stays inside and Escape closes it. Android Back closes it too.
 */
export function Sheet({ open, onClose, title, name, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useBackToClose(open, onClose);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
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
      aria-labelledby={`${name}-title`}
      onClick={onBackdrop}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {open && (
        <div className="sheet-body">
          <header className="sheet-head">
            <h2 id={`${name}-title`} className="sheet-title" tabIndex={-1}>
              {title}
            </h2>
            <button type="button" className="text-button sheet-close" onClick={onClose}>
              Close
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  );
}
