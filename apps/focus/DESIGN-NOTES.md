# Focus design notes

Direction: Orbit. This file lists what was decided, what else was tried, and what is still open for Roger.

## What is on the screen

- **The orbit.** Two stars circle a shared centre. The cream star is the left ear, the tinted star is the right ear. Each leaves a short trail.
- **The timer is part of the orbit.** A faint ring around the orbit fills with gold as the session runs, with a small bright bead at its head. The time left sits in the empty centre of the orbit, where the stars never pass.
- **Preset name** in Cormorant, large, at the top. Under it one line: the beat rate and the wording. Under that a small gold outline label (evidence, or "60 second preview").
- **"Headphones on"** with a glowing dot, top left. It is a reminder only.
- **Controls in thumb reach:** play in the middle, length on its left ("Prime, 10 min"), volume on its right ("Volume, 30%"). Both side buttons open a sheet. The five presets sit in one row at the very bottom, with a gold dot under the chosen one.
- **Sheets** slide up from the bottom on a phone and are centred cards from 640px. Android Back and Escape close them.

## Motion

- Orbit speed is `0.08 + log2(beat + 1) * 0.09` turns per second, capped at 0.6. Sleep turns once every 4.5 s, Deep focus once every 1.8 s. Nothing moves or changes brightness at the beat rate. A unit test checks the cap for every beat from 1 to 40 Hz.
- Changing preset eases the speed and the colours over about 2 seconds. Nothing jumps.
- **Start and stop:** on play the stars speed up from a slow drift (30% speed), their glow widens and their trails grow from short to long. On pause they do the reverse. A soft warm glow fades in behind the orbit while playing.
- **Colour per preset:** the glow behind the orbit and the right-ear star shift a little. Sleep is violet with a lilac star, Calm is the reference blue with gold, Relaxed focus leans teal, Focus is a stronger blue, Deep focus is plum with an amber star.
- **Last minute:** the two stars slowly draw 25% closer together. Sessions under 3 minutes (and the preview) skip this.
- **Session complete:** the stars spiral into one brighter star at the centre, one slow ring opens outward once (3.5 s), and the timer ring is fully gold. The heading changes to "Prime complete." with "Start your work now." under it, or "Session complete." with what was played.
- **Starfield:** painted once per screen size. Two of its three layers fade in and out over 9 and 13 seconds for a slow twinkle.
- **Reduced motion:** one orbit takes 100 seconds, no trails, no twinkle, no slide or fade on sheets, and state changes happen at once.
- The orbit animation stops while the page is hidden. Audio keeps playing.

## Tried and changed

- **Numerals.** Cormorant's default numerals are old-style (they dip below the line). The clock looked uneven, so the whole app uses lining numerals. Clock digits also sit in fixed-width boxes, so the time does not shake as it counts.
- **Trail ends.** Round line ends showed as a row of beads along the trail. Flat, slightly overlapping segments give a smooth trail.
- **Space for the hint line.** A reserved two-line slot above the controls made the orbit small on short phones. The slot now takes no room when empty, and the orbit eases to its new size when a line appears or goes.
- **Star size.** Fixed-size stars looked lost on tablet. They now scale up with the orbit, to at most 1.7 times.

## Considered, not built

- **Trail as the timer** (the reference's caption). A trail that grows for 10 to 90 minutes either wraps over itself or moves too little to read. The ring reads at a glance.
- **Rotating the whole starfield.** It competed with the orbit for attention.
- **Blurred glass behind sheets and the play button.** Backdrop blur is costly on mid-range Android phones. Sheets are solid.

## Open for Roger

1. **Serif.** Cormorant is kept from the reference. Its hairlines are thin at small sizes, so it is only used at 21px and up. Say if you want to see another serif.
2. **"Evidence: pending" label.** It shows until step 3. After that it reads "Some research", "Mixed results" or "Little research". Should it link to the science page?
3. **Lock marks on Relaxed and Deep.** Small and quiet now. They could be removed, since the "60 second preview" label already says it.
4. **Preview repeats.** A free user can play the 60 second preview of a locked preset again after it ends. Each time ends with the unlock offer. A limit per day is possible if you want one.
5. **Changing length or mode during a session** restarts the timer and keeps the sound playing.
6. **Prime mode is the default mode**, so the left button reads "Prime, 10 min" until you switch to Session in the Length sheet.
7. **App icon.** Not designed yet. It comes with the final checks step.
8. **Menu.** The three dots open links to The science, Lifetime unlock, Restore purchase and Privacy. Those pages are placeholders until steps 4 and 5.

## Audio route

Both routes from step 1 are still in the code. The player uses route B (direct output with a silent audio element), set in `src/lib/app-player.ts`. This is waiting for Roger's phone results from the test page, which is still at `/focus/bench` in dev.

## iPhone Safari

Not tested yet. To check on an iPhone: sound with the ring switch on silent, sound after locking the screen, and the lock screen controls.

## Dev helpers

- `/focus/bench`: the audio test page. Dev only, left out of the production build.
- `/focus/?unlocked`: shows the app as it is after the lifetime unlock. Dev only.
