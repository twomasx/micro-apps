import { PatternStage } from './pattern/PatternStage';
import type { BreathTheme } from './types';

export const patternTheme: BreathTheme = { id: 'pattern', name: 'Pattern', Stage: PatternStage };

/** Every look the breathing screen can take. Tide comes later. */
export const themes: readonly BreathTheme[] = [patternTheme];
export const defaultTheme = patternTheme;
