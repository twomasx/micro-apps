import { useEffect, useState } from 'react';
import { loadUnlock } from '../lib/store';
import type { SavedUnlock } from '../lib/unlock';

/** The unlock code saved on this device. Read again when `unlocked` changes. */
export function useSavedUnlock(unlocked: boolean): SavedUnlock | null {
  const [saved, setSaved] = useState<SavedUnlock | null>(null);
  useEffect(() => {
    let current = true;
    void loadUnlock().then((value) => {
      if (current) setSaved(value);
    });
    return () => {
      current = false;
    };
  }, [unlocked]);
  return saved;
}
