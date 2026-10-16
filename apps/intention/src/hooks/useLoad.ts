import { useEffect, useState } from 'react';

export type Load<T> = { state: 'loading' } | { state: 'ready'; data: T } | { state: 'error' };

/** Runs `load` once (and again when it changes) and keeps its result. */
export function useLoad<T>(load: () => Promise<T>): Load<T> {
  const [value, setValue] = useState<Load<T>>({ state: 'loading' });
  useEffect(() => {
    let live = true;
    load().then(
      (data) => live && setValue({ state: 'ready', data }),
      () => live && setValue({ state: 'error' }),
    );
    return () => {
      live = false;
    };
  }, [load]);
  return value;
}
