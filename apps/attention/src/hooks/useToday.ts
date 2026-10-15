import { useEffect, useMemo, useState } from 'react';
import { latestSession } from '../lib/history';
import { canTrainToday, effectiveSize, targetSeconds } from '../lib/limits';
import { currentLevel, dayStatus, localDate, testPrompt } from '../lib/program';
import { useAppData } from './useAppData';
import { useUnlocked } from './useUnlocked';

/** Everything Today and the session screen need to know about where the user is. */
export function useToday() {
  const data = useAppData();
  const unlocked = useUnlocked();
  const date = useLocalDate();
  return useMemo(() => {
    const status = dayStatus(data.sessions, date);
    const size = effectiveSize(data.settings.size, unlocked);
    return {
      loaded: data.loaded,
      settings: data.settings,
      unlocked,
      status,
      level: currentLevel(data.sessions),
      size,
      targetSeconds: targetSeconds(size, status.dayNumber),
      canTrain: canTrainToday(unlocked, status),
      prompt: testPrompt(status.completedDays, data.tests),
      last: latestSession(data.sessions),
    };
  }, [data, unlocked, date]);
}

/** Today's local date. Checked again when the app comes back into view, so it rolls over at midnight. */
function useLocalDate(): string {
  const [date, setDate] = useState(() => localDate(Date.now()));
  useEffect(() => {
    const check = () => setDate(localDate(Date.now()));
    document.addEventListener('visibilitychange', check);
    return () => document.removeEventListener('visibilitychange', check);
  }, []);
  return date;
}
