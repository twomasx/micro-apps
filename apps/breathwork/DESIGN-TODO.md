# Breathwork: open decisions for Roger

Decisions that are built the simplest way for now and need your call. What has been decided, and why, is in `DESIGN-NOTES.md`.

## Open decisions

1. **The cyclic sigh's shape.** A steep climb, a short top-up, then a long curved slide back down. The slide has to bow (2 s + 1 s of breathing in can't reach across a 6 s side in straight lines), so the shape looks like a sail or a fin. Say if you would rather see something else.
2. **The first-visit screen** keeps the full safety text (the spec asks for it there). To give the drawing shape room on small phones, the wording line and evidence label are hidden until you press Start.
3. **Desktop** leaves space in the right column between the name and the phase word. It could hold the session progress or a short description of the technique.
4. **Time left on a finished session** reads 0:00. It could show the session length instead.
5. **Custom pattern buttons** step by whole seconds. The data allows half seconds (like Resonant's 5.5 s), so half-second steps can be added if you want them.
6. **Unfinished sessions** are not recorded. Only a session that runs to the end leaves its shape on Your week. A partly drawn shape for a stopped session is possible.
7. **Free users' sessions are recorded too,** so Your week is already filled in on the day they unlock. They see an example week until then.
8. **Custom patterns on the breathing screen** show as "Your pattern" with their seconds as the wording line, and no picker button is selected. They are reached from the menu (Custom patterns, then Breathe this pattern).
9. **Evidence label on the breathing screen** ("Little research", with an arrow) opens the science page at that technique, as in focus. Its tap area is 50px tall. Say if you would rather it were plain text.
10. **App icon:** the cyclic sigh's shape with the yellow dot, on cobalt. Files in `public/`.

## Device checks still open

- Android Chrome: tones, vibration and the screen staying awake during a session.
- iPhone Safari: tones with the silent switch on, and music pausing when a session starts with sound on.
- Wake lock needs https or localhost. Over plain http on a LAN address it shows "not supported". It will work on polymadlabs.com.

## Payments across the apps (PAYMENTS.md)

- [ ] **"Unlocks open soon":** while payments are closed (the kill switch), the buy button is disabled, says "Unlocks open soon" and has `data-state="closed"` (open is `data-state="open"`). Style the closed state.
- [ ] **TEST MODE label:** staging only (`.test-mode-label`, `data-mode="test"`, in `src/components/TestModeLabel.tsx`, shown when the hostname starts with `staging.`). For now it is fixed to the top edge in the middle, in plain system colors, and taps go through it. Production never shows it.
- [ ] **Pass offer line** (`.pass-offer`, under the buy button): "Or get every app for $19.99 once." and a link to the pass page.
- [ ] **Restore box takes pass codes too.** The intro line now ends "A PolymadLabs pass code works here too." Messages for a refunded or disputed pass, and for a code in use on 5 devices, come from `@micro/payments/pass`.
