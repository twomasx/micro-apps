/** A stable brush seed for stretch `index` of a session, so its circle looks the same everywhere. */
export function seedFor(sessionId: string, index: number): number {
  let h = 2166136261;
  for (const ch of `${sessionId}:${index}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return ((h >>> 0) % 100000) / 100 + 1;
}
