# Breathwork: open decisions for Roger

Decisions that are built the simplest way for now and need your call. What has been decided, and why, is in `DESIGN-NOTES.md`.

## Open

1. **App icon and favicon** come with the design in step 2. Until then the browser asks for `/favicon.ico` and gets a 404 in the console.

## Device checks still open

- Android Chrome: tones, vibration and the screen staying awake during a session (bench page, step 1).
- iPhone Safari: tones with the silent switch on, and music pausing when a session starts with sound on.
- Wake lock needs https or localhost. Over plain http on a LAN address it shows "not supported". It will work on polymadlabs.com.
