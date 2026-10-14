# Breathwork: open decisions for Roger

Decisions that are built the simplest way for now and need your call. What has been decided, and why, is in `DESIGN-NOTES.md`.

## For the step 2 design review

1. **The cyclic sigh's shape.** A steep climb, a short top-up, then a long curved slide back down. The slide has to bow (2 s + 1 s of breathing in can't reach across a 6 s side in straight lines), so the shape looks like a sail or a fin. Say if you would rather see something else.
2. **The first-visit screen** shows the full safety text under the explanation. On a small phone it pushes the shape smaller while the screen is up. It could become one line with a link to the science page.
3. **Desktop** leaves space in the right column between the name and the phase word. It could hold the session progress or a short description of the technique.
4. **Time left on a finished session** reads 0:00. It could show the session length instead.
5. **Menu pages** (week, custom, science, unlock, restore, privacy) are placeholders until steps 4 and 5.
6. **App icon:** the cyclic sigh's shape with the yellow dot, on cobalt. Files in `public/`.

## Device checks still open

- Android Chrome: tones, vibration and the screen staying awake during a session.
- iPhone Safari: tones with the silent switch on, and music pausing when a session starts with sound on.
- Wake lock needs https or localhost. Over plain http on a LAN address it shows "not supported". It will work on polymadlabs.com.
