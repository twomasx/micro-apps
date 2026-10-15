import { describe, expect, it } from 'vitest';
import { FIRST_SESSION_STEPS, PROBE_NOTE, sessionMessage } from './session-copy';
import { initialSession, sessionReducer } from './session';

const noProbe = { seconds: 20, probeAtSeconds: null };

describe('session wording', () => {
  it('says how long the first stretch is', () => {
    expect(sessionMessage(initialSession(22, 600)).line).toBe('First stretch 0:22.');
  });

  it('praises nothing and blames nothing after an answer', () => {
    let s = sessionReducer(initialSession(20, 600), { type: 'begin', now: 0, plan: noProbe });
    s = sessionReducer(sessionReducer(s, { type: 'bell' }), { type: 'answer', stayed: false });
    expect(sessionMessage(s).line).toBe('That is normal. The next one is a little shorter.');
  });

  it('follows the writing rules: no em dashes, no exclamation marks', () => {
    const all = [...FIRST_SESSION_STEPS, PROBE_NOTE];
    for (const phase of ['ready', 'stretch', 'ask', 'rest', 'paused'] as const) {
      const m = sessionMessage({ ...initialSession(20, 600), phase });
      all.push(m.line, m.hint ?? '');
    }
    for (const text of all) expect(text).not.toMatch(/[—!]/);
  });
});
