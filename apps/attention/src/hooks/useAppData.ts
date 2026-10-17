import { useEffect, useSyncExternalStore } from 'react';
import { getAppData, loadAppData, subscribeAppData, type AppData } from '../lib/app-data';

export function useAppData(): AppData {
  const data = useSyncExternalStore(subscribeAppData, getAppData, getAppData);
  useEffect(() => {
    void loadAppData();
  }, []);
  return data;
}
