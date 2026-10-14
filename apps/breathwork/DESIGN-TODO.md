# Breathwork: open decisions for Roger

Decisions that are built the simplest way for now and need your call. Design notes and alternatives tried go in `DESIGN-NOTES.md` (from step 2).

## From step 1 (breathing engine)

1. **Sessions are rounded to whole breaths**, so a session never stops halfway through a breath. 5 minutes of the cyclic sigh is 33 breaths (4:57). 1 minute of Box is 4 breaths (1:04). The clock shows the rounded time. The one minute preview is rounded the same way (Resonant: 55 s).
2. **The countdown rounds up.** Resonant's 5.5 s phases count 6, 5, 4, 3, 2, 1, so the 6 shows for half a second. The other techniques use whole seconds and are not affected.
3. **Sound cues.** In rises (440 to 587 Hz, 0.4 s). The cyclic sigh's top-up is a shorter, higher rise. Hold is one level note. Out falls and is longer and softer (494 to 370 Hz, 0.7 s). "Done" is one long, quiet note. Tell me if any of them is too loud, too quiet or annoying after 5 minutes.
4. **iPhone silent switch.** On Safari 17 and up, the cues are set to "ambient": they mix with music you are already playing and stay silent when the ring switch is on silent. The other choice ("playback") would play through the silent switch but pause your music.
5. **Vibration patterns** (Android): in 40 ms, top-up 20 ms, hold 12 ms, out two short buzzes, done three buzzes.
6. **App icon and favicon** come with the design in step 2. Until then the browser asks for `/favicon.ico` and gets a 404 in the console.

## Device checks still open

- Android Chrome: tones, vibration and the screen staying awake during a session (bench page, step 1).
- iPhone Safari: tones, with the silent switch on and off.
- Wake lock needs https or localhost. Over plain http on a LAN address it shows "not supported". It will work on polymadlabs.com.
