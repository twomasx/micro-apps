import { useMemo, useSyncExternalStore } from 'react';
import { currentLocation, serverLocationSnapshot, subscribeToLocation } from '../lib/navigation';
import { parseRoute, type Route } from '../lib/router';

export function useRoute(): Route {
  const location = useSyncExternalStore(subscribeToLocation, currentLocation, serverLocationSnapshot);
  return useMemo(() => {
    // The origin only lets URL parse the path; any will do when there is no browser.
    const url = new URL(location, 'https://origin.invalid');
    return parseRoute(url.pathname, url.search, import.meta.env.BASE_URL);
  }, [location]);
}
