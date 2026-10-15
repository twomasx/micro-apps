/**
 * Whether this device has the lifetime unlock. False until payments are built (step 5),
 * when this reads the confirmed unlock as in focus and breathwork.
 * Development only: localStorage 'attention:dev-unlock' = '1' shows the unlocked screens.
 */
export function useUnlocked(): boolean {
  if (!import.meta.env.DEV) return false;
  try {
    return localStorage.getItem('attention:dev-unlock') === '1';
  } catch {
    return false;
  }
}
