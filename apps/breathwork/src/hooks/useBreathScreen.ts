import { useEffect, useState } from 'react';
import { sessionPlan, type SessionPlan } from '../lib/limits';
import { DEFAULT_SETTINGS, type Settings } from '../lib/settings';
import { loadSettings, saveSettings } from '../lib/store';
import { findTechnique, techniques, type Technique } from '../lib/techniques';
import type { StageMoment } from '../themes/types';
import { useBreathController } from './useBreathController';

// The lifetime unlock arrives in step 5. Until then everyone gets the free tier.
const UNLOCKED = false;

function techniqueFor(id: string): Technique {
  return findTechnique(id) ?? techniques[0]!;
}

/** Everything the breathing screen does, without any markup. */
export function useBreathScreen() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const technique = techniqueFor(settings.techniqueId);
  const plan: SessionPlan = sessionPlan(technique, settings.minutes, UNLOCKED);
  const { controller, snapshot } = useBreathController(technique, plan.durationMs);

  useEffect(() => {
    let live = true;
    void loadSettings().then((saved) => {
      if (!live) return;
      setSettings(saved);
      setLoaded(true);
      const t = techniqueFor(saved.techniqueId);
      controller.select(t, sessionPlan(t, saved.minutes, UNLOCKED).durationMs);
      if (saved.muted) controller.setMuted(true);
    });
    return () => {
      live = false;
    };
  }, [controller]);

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
    controller.select(next, sessionPlan(next, settings.minutes, UNLOCKED).durationMs);
  };

  const setMinutes = (minutes: number) => {
    update({ minutes });
    controller.select(technique, sessionPlan(technique, minutes, UNLOCKED).durationMs);
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
    unlocked: UNLOCKED,
    minutes: settings.minutes,
    moment,
    selectTechnique,
    setMinutes,
    toggleSound,
    toggle: () => controller.toggle(),
    startFromIntro,
  };
}
