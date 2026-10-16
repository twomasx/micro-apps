# Focus: design decisions left for Roger

For this app Claude made the design (see the spec). These are the choices still open. The full reasoning and the alternatives tried are in `DESIGN-NOTES.md`.

## Player

- [ ] **Serif.** Cormorant, kept from the reference. Say if you want to see another serif.
- [ ] **Evidence label links to the science page.** It has a small arrow. Keep it, or make it plain text.
- [ ] **Lock marks on Relaxed and Deep.** Keep them, or rely on the "60 second preview" label alone.
- [ ] **Preview repeats.** A free user can replay the 60 second preview as often as they like. Add a daily limit or not.
- [ ] **Changing length or mode during a session** restarts the timer and keeps playing. Keep, or ask first.
- [ ] **Prime is the default mode.** Keep, or start new users in Session.
- [ ] **Starting volume 30%, top of the slider capped** well below full output. Judge it on your phone with headphones.

## Payments

- [ ] **History counts finished sessions only.** Count stopped sessions too, or not.
- [ ] **Code card.** Add a Share button next to Copy, or keep one action.

## App icon

- [ ] **The icon** (two stars on a ring, `public/icon-512.png`). Keep or change.

## Still to check on real devices

- [ ] **Android Chrome:** the left-only and right-only tones on `/focus/bench` in dev (no sound in the other ear), 2 minutes with the screen off, and the play and pause controls on the lock screen.
- [ ] **iPhone Safari:** sound with the ring switch on silent, sound after locking the screen, and the lock screen controls.

## Payments across the apps (PAYMENTS.md)

- [ ] **"Unlocks open soon":** while payments are closed (the kill switch), the buy button is disabled, says "Unlocks open soon" and has `data-state="closed"` (open is `data-state="open"`). Style the closed state.
- [ ] **TEST MODE label:** staging only (`.test-mode-label`, `data-mode="test"`, in `src/components/TestModeLabel.tsx`, shown when the hostname starts with `staging.`). For now it is fixed to the top edge in the middle, in plain system colors, and taps go through it. Production never shows it.
