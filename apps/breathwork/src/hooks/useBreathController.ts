import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  browserDeps,
  createBreathController,
  type BreathController,
  type BreathSnapshot,
  type ControllerDeps,
} from '../lib/breath-controller';
import type { Technique } from '../lib/techniques';

/**
 * One breathing controller for the life of the component, and the text-level snapshot of it.
 * Themes subscribe to `controller.onFrame` themselves; React only re-renders when the
 * phase, the count or the clock changes.
 */
export function useBreathController(
  technique: Technique,
  durationMs: number,
  parts?: Partial<ControllerDeps>,
): { controller: BreathController; snapshot: BreathSnapshot } {
  const [controller] = useState(() => createBreathController(technique, durationMs, browserDeps(parts)));
  useEffect(() => controller.connect(), [controller]);
  const snapshot = useSyncExternalStore(controller.subscribe, controller.snapshot);
  return { controller, snapshot };
}
