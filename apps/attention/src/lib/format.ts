/** "0:22", "1:05", "10:00". Whole seconds. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** "22 seconds", "1 minute 5 seconds", "10 minutes". For screen readers and plain sentences. */
export function spoken(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  const parts: string[] = [];
  if (m > 0) parts.push(`${m} ${m === 1 ? 'minute' : 'minutes'}`);
  if (r > 0 || m === 0) parts.push(`${r} ${r === 1 ? 'second' : 'seconds'}`);
  return parts.join(' ');
}
