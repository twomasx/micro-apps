import { useEffect, useRef, useState } from 'react';
import { customToTechnique, type CustomPattern } from '../lib/custom';
import { recordId } from '../lib/history';
import { sessionPlan, type SessionPlan } from '../lib/limits';
import { CUSTOM_ID, DEFAULT_SETTINGS, type Settings } from '../lib/settings';
import { navigate } from '../lib/navigation';
import { introSeenHint, loadSettings, recordSession, saveSettings } from '../lib/store';
import { findTechnique, techniques, type Technique } from '../lib/techniques';
import type { StageMoment } from '../themes/types';
import { useBreathController } from './useBreathController';
import { useUnlocked } from './useUnlocked';

/** The technique the settings point at: a built-in one, or the saved custom pattern. */
export function techniqueFor(settings: Pick<Settings, 'techniqueId' | 'custom'>): Technique {
  if (settings.techniqueId === CUSTOM_ID && settings.custom) return customToTechnique(settings.custom);
  return findTechnique(settings.techniqueId) ?? techniques[0]!;
}

/**
 * The technique the address asks for, from a guide page's start button: '?t=box'. Null for none or an unknown id.
 * Locked techniques still open: they run their one-minute preview, as when picked on the screen.
 */
export function techniqueFromAddress(search: string): string | null {
  const id = new URLSearchParams(search).get('t');
  return id !== null && findTechnique(id) ? id : null;
}

function askedTechnique(): string | null {
  return typeof window === 'undefined' ? null : techniqueFromAddress(window.location.search);
}

/** Everything the breathing screen does, without any markup. */
export function useBreathScreen() {
  const unlocked = useUnlocked();
  // A guide's start button picks the technique for the very first frame, so the shape never swaps.
  const [settings, setSettings] = useState<Settings>(() => {
    const asked = askedTechnique();
    return asked ? { ...DEFAULT_SETTINGS, techniqueId: asked } : DEFAULT_SETTINGS;
  });
  const [loaded, setLoaded] = useState(false);
  // Until the saved settings arrive, the quick flag decides between the first-visit screen and the breathing screen.
  const [introSeenEarly] = useState(introSeenHint);
  const technique = techniqueFor(settings);
  const plan: SessionPlan = sessionPlan(technique, settings.minutes, unlocked);
  const { controller, snapshot } = useBreathController(technique, plan.durationMs);

  // The finish handler needs the plan the session started with, so an unlock that arrives
  // during a preview does not turn that preview into a recorded session.
  const planRef = useRef(plan);
  useEffect(() => {
    if (snapshot.status !== 'running' && snapshot.status !== 'paused') planRef.current = plan;
  });

  useEffect(() => {
    let live = true;
    void loadSettings().then((stored) => {
      if (!live) return;
      // The asked technique becomes the saved choice, and the address goes back to plain /breathwork/.
      const asked = askedTechnique();
      const saved = asked ? { ...stored, techniqueId: asked } : stored;
      if (asked) {
        void saveSettings(saved);
        navigate('', { replace: true });
      }
      setSettings(saved);
      setLoaded(true);
      // People who saw the intro before the quick flag existed get it now.
      if (saved.introSeen && !introSeenEarly) void saveSettings(saved);
      const t = techniqueFor(saved);
      controller.select(t, sessionPlan(t, saved.minutes, unlocked).durationMs);
      if (saved.muted) controller.setMuted(true);
    });
    return () => {
      live = false;
    };
    // Settings load once. A change of unlock is handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller]);

  // When the unlock arrives (or goes), a session that has not started takes the new length.
  useEffect(() => {
    const frame = controller.frame();
    if (frame.status === 'ready' && frame.durationMs !== plan.durationMs) controller.select(technique, plan.durationMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);

  // Every finished session goes into the history for Your week. Previews do not.
  useEffect(
    () =>
      controller.onComplete((frame) => {
        if (planRef.current.preview) return;
        void recordSession({
          id: recordId(),
          at: Date.now(),
          techniqueId: frame.technique.id,
          name: frame.technique.name,
          phases: frame.technique.phases.map(({ kind, ms }) => ({ kind, ms })),
          durationMs: frame.durationMs,
        });
      }),
    [controller],
  );

  const update = (patch: Partial<Settings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      void saveSettings(next);
      return next;
    });
  };

  const selectTechnique = (next: Technique) => {
    if (next.id === technique.id && snapshot.status !== 'complete') return;
    update({ techniqueId: next.id });
    controller.select(next, sessionPlan(next, settings.minutes, unlocked).durationMs);
  };

  const setMinutes = (minutes: number) => {
    update({ minutes });
    controller.select(technique, sessionPlan(technique, minutes, unlocked).durationMs);
  };

  const toggleSound = () => {
    const muted = !snapshot.muted;
    update({ muted });
    controller.setMuted(muted);
  };

  /** The first-visit screen is answered by starting a session. */
  const startFromIntro = () => {
    update({ introSeen: true });
    controller.start();
  };

  const introSeen = loaded ? settings.introSeen : introSeenEarly;
  const moment: StageMoment = !introSeen ? 'intro' : snapshot.status === 'complete' ? 'complete' : 'live';

  return {
    controller,
    snapshot,
    technique,
    plan,
    unlocked,
    minutes: settings.minutes,
    moment,
    isCustom: settings.techniqueId === CUSTOM_ID,
    selectTechnique,
    setMinutes,
    toggleSound,
    toggle: () => controller.toggle(),
    startFromIntro,
  };
}

/** Makes the breathing screen open on a custom pattern. Used by the custom pattern page. */
export async function chooseCustom(pattern: CustomPattern): Promise<void> {
  const saved = await loadSettings();
  await saveSettings({ ...saved, techniqueId: CUSTOM_ID, custom: pattern, introSeen: true });
}
