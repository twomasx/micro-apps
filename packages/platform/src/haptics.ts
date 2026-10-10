/** Vibration API wrapper. Returns false where unsupported (e.g. iPhone Safari). */
export function vibrate(pattern: number | number[]): boolean {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return false;
  return navigator.vibrate(pattern);
}
