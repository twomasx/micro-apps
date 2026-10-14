import { useEffect, useRef, useState } from 'react';
import { customToTechnique, type CustomPattern } from '../lib/custom';
import { recordId } from '../lib/history';
import { sessionPlan, type SessionPlan } from '../lib/limits';
import { CUSTOM_ID, DEFAULT_SETTINGS, type Settings } from '../lib/settings';
import { loadSettings, recordSession, saveSettings } from '../lib/store';
import { findTechnique, techniques, type Technique } from '../lib/techniques';
import type { StageMoment } from '../themes/types';
import { useBreathController } from './useBreathController';
import { useUnlocked } from './useUnlocked';

/** The technique the settings point at: a built-in one, or the saved custom pattern. */
export function techniqueFor(settings: Pick<Settings, 'techniqueId' | 'custom'>): Technique {
  if (settings.techniqueId === CUSTOM_ID && settings.custom) return customToTechnique(settings.custom);
  return findTechnique(settings.techniqueId) ?? techniques[0]!;
}

/** Everything the breathing screen does, without any markup. */
export function useBreathScreen() {
  const unlocked = useUnlocked();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const technique = techniqueFor(settings);
  const plan: SessionPlan = sessionPlan(technique, settings.minutes, unlocked);
  const { controller, snapshot } = useBreathController(technique, plan.durationMs);

  // The finish handler needs the plan the session ran with.
  const planRef = useRef(plan);
  useEffect(() => {
    planRef.current = plan;
  });

  useEffect(() => {
    let live = true;
    void loadSettings().then((saved) => {
      if (!live) return;
      setSettings(saved);
      setLoaded(true);
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

  const moment: StageMoment =
    loaded && !settings.introSeen ? 'intro' : snapshot.status === 'complete' ? 'complete' : 'live';

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
