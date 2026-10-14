import { useMemo, useSyncExternalStore } from 'react';
import { currentLocation, subscribeToLocation } from '../lib/navigation';
import { parseRoute, type Route } from '../lib/router';

export function useRoute(): Route {
  const location = useSyncExternalStore(subscribeToLocation, currentLocation);
  return useMemo(() => {
    const url = new URL(location, window.location.origin);
    return parseRoute(url.pathname, url.search, import.meta.env.BASE_URL);
  }, [location]);
}
