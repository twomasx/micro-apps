import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, sanitizeSettings } from './settings';

describe('sanitizeSettings', () => {
  it('starts on the cyclic sigh for 5 minutes, sound on, intro not seen', () => {
    expect(sanitizeSettings(undefined)).toEqual({
      techniqueId: 'sigh',
      minutes: 5,
      muted: false,
      introSeen: false,
      custom: null,
    });
  });

  it('keeps valid saved settings', () => {
    const saved = { techniqueId: 'resonant', minutes: 20, muted: true, introSeen: true, custom: null };
    expect(sanitizeSettings(saved)).toEqual(saved);
  });

  it('drops unknown techniques and lengths that are not offered', () => {
    expect(sanitizeSettings({ techniqueId: 'wim', minutes: 7 })).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings({ techniqueId: 42, minutes: '5', muted: 'yes' })).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps a valid custom pattern, and falls back when it is missing or broken', () => {
    const custom = { in: 4, holdIn: 2, out: 6, holdOut: 0 };
    expect(sanitizeSettings({ techniqueId: 'custom', custom })).toMatchObject({ techniqueId: 'custom', custom });
    expect(sanitizeSettings({ techniqueId: 'custom' }).techniqueId).toBe('sigh');
    expect(sanitizeSettings({ techniqueId: 'custom', custom: { in: 1, holdIn: 0, out: 1, holdOut: 0 } })).toMatchObject({
      techniqueId: 'sigh',
      custom: null,
    });
  });
});
