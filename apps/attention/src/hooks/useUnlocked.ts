/**
 * Whether this device has the lifetime unlock. Always false until payments are built
 * (step 5), when this reads the confirmed unlock as in focus and breathwork.
 */
export function useUnlocked(): boolean {
  return false;
}
