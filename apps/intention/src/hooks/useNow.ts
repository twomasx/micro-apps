import { useEffect, useState } from 'react';

/**
 * The current time, updated every `everyMs`. For countdowns. Null while a page is rendered at build time:
 * the HTML the server sends must not hold a moment that is already past when someone opens it, so it shows
 * the parts that do not depend on the time, and the app adds the rest when it starts.
 */
export function useNow(everyMs: number): number | null {
  const [now, setNow] = useState<number | null>(() => (typeof window === 'undefined' ? null : Date.now()));
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(timer);
  }, [everyMs]);
  return now;
}
