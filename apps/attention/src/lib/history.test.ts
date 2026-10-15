import { describe, expect, it } from 'vitest';
import { latestSession, MAX_SESSIONS, sanitizeSessions, upsertSession } from './history';
import { session, stretch } from './testing';

describe('session history', () => {
  it('drops broken entries and keeps good ones in time order', () => {
    const a = session('2026-10-02');
    const b = session('2026-10-01');
    const clean = sanitizeSessions([a, 'junk', { id: 1 }, b, { ...a, id: 'x', date: 'yesterday' }]);
    expect(clean.map((s) => s.date)).toEqual(['2026-10-01', '2026-10-02']);
  });

  it('returns an empty list for anything that is not a list', () => {
    expect(sanitizeSessions(undefined)).toEqual([]);
    expect(sanitizeSessions({})).toEqual([]);
  });

  it('drops broken stretches and repairs a broken level', () => {
    const raw = { ...session('2026-10-01'), stretches: [stretch(20, true), { seconds: 'x' }], nextSeconds: -4 };
    const [clean] = sanitizeSessions([raw]);
    expect(clean!.stretches).toHaveLength(1);
    expect(clean!.nextSeconds).toBe(10);
  });

  it('replaces the saved copy of a session that is still running', () => {
    const first = session('2026-10-01', { id: 'abc', stretches: [stretch(20, true)] });
    const later = { ...first, stretches: [stretch(20, true), stretch(22, false)] };
    const list = upsertSession(upsertSession([], first), later);
    expect(list).toHaveLength(1);
    expect(list[0]!.stretches).toHaveLength(2);
  });

  it('caps the list', () => {
    const many = Array.from({ length: MAX_SESSIONS }, (_, i) => session('2026-10-01', { id: `s${i}`, startedAt: i }));
    const list = upsertSession(many, session('2026-10-02', { id: 'new', startedAt: MAX_SESSIONS }));
    expect(list).toHaveLength(MAX_SESSIONS);
    expect(list.at(-1)!.id).toBe('new');
    expect(list[0]!.id).toBe('s1');
  });

  it('finds the latest session with an answer', () => {
    const list = [session('2026-10-01', { id: 'a' }), session('2026-10-02', { id: 'b', stretches: [] })];
    expect(latestSession(list)?.id).toBe('a');
    expect(latestSession([])).toBeNull();
  });
});
