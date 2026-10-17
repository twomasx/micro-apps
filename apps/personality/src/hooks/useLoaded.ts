import { useEffect, useState } from 'react';

/**
 * Runs an async loader once and returns its value, or `initial` (usually undefined) while it loads.
 */
export function useLoaded<T>(load: () => Promise<T>, initial?: T): T | undefined {
  const [value, setValue] = useState<T | undefined>(initial);
  useEffect(() => {
    let cancelled = false;
    void load().then((loaded) => {
      if (!cancelled) setValue(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);
  return value;
}
