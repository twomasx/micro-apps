import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, sanitizeSettings } from './settings';

describe('settings', () => {
  it('falls back to defaults for missing or broken data', () => {
    expect(sanitizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings('nope')).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings({ volume: 'loud', size: 12, probes: 'yes' })).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid values', () => {
    const saved = { volume: 0.3, probes: false, size: 'study', introSeen: true, practiceDone: true };
    expect(sanitizeSettings(saved)).toEqual(saved);
  });

  it('keeps volume between 0 and 1', () => {
    expect(sanitizeSettings({ volume: 4 }).volume).toBe(1);
    expect(sanitizeSettings({ volume: -1 }).volume).toBe(0);
  });

  it('has probes on by default', () => {
    expect(DEFAULT_SETTINGS.probes).toBe(true);
  });
});
