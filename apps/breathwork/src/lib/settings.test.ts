import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, sanitizeSettings } from './settings';

describe('sanitizeSettings', () => {
  it('starts on the cyclic sigh for 5 minutes, sound on, intro not seen', () => {
    expect(sanitizeSettings(undefined)).toEqual({ techniqueId: 'sigh', minutes: 5, muted: false, introSeen: false });
  });

  it('keeps valid saved settings', () => {
    const saved = { techniqueId: 'resonant', minutes: 20, muted: true, introSeen: true };
    expect(sanitizeSettings(saved)).toEqual(saved);
  });

  it('drops unknown techniques and lengths that are not offered', () => {
    expect(sanitizeSettings({ techniqueId: 'wim', minutes: 7 })).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings({ techniqueId: 42, minutes: '5', muted: 'yes' })).toEqual(DEFAULT_SETTINGS);
  });
});
