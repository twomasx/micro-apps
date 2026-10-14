# Breathwork design notes

Direction: Pattern. This file lists what was decided and why, and what else was tried. Open questions for Roger are in `DESIGN-TODO.md`.

## Timing and cues (decided in step 1)

Roger asked for the choices that best fit how breathwork is actually practiced.

- **Sessions are whole breaths.** A practice ends after a complete breath, on the out-breath (or the empty hold in Box), never cut off halfway. Lengths are rounded to the nearest whole breath: 5 minutes of the cyclic sigh is 33 breaths (4:57), 1 minute of Box is 4 breaths (1:04). The clock shows the rounded time. The one minute preview is rounded the same way (Resonant: 55 s).
- **The count is the seconds you follow.** It counts whole seconds down to 1 as the phase ends, never 0. Resonant's 5.5 s phases count 5, 4, 3, 2, 1: the 5 holds the extra half second, so each later number lasts exactly one second and the 1 always lands on the change. The first version counted down from 6, but the 6 showed for half a second, like a skipped beat.
- **The cues are a deep, hummed chant, not beeps.** Roger found the first tones (440 to 700 Hz sines) too high and "dingy". Each phase change is now a low hum like a voice sounding "Om", built from plain Web Audio: a note full of overtones, two voices a few cents apart, a soft note an octave below, a slow vibrato (4.8 Hz) and a short room reverb made in code. A filter moves like a vowel: the in-breath opens from "mm" to "aa", the out-breath closes through "oo" back to "mm". No sound library: Tone.js and similar would roughly double the app's JavaScript for something Web Audio does directly.
  - In: rises a fourth, A2 to D3 (110 to 147 Hz), 1.8 s, the vowel opening.
  - Top-up (cyclic sigh): one step higher, D3 to E3, 0.9 s, so the double breath can be heard with eyes closed.
  - Hold: a quiet, closed-mouth hum on A2, 1.4 s.
  - Out: sinks D3 to A2, 2.6 s, the longest and softest, the vowel closing to a hum, like a slow exhale.
  - Done: the soft bell from before (392 Hz), which Roger liked.
  - A cue never outlasts its phase (at most 90% of it), so short phases don't pile sounds on top of each other.
  - Measured offline: about 60% of the hum's energy is under 300 Hz and none is above 1 kHz. The overtones between 300 Hz and 1 kHz keep it audible on phone speakers, which play little below 200 Hz. It sounds fullest on headphones.
- **iPhone: tones play through the silent switch.** iPhones have no vibration, so on a phone kept on silent the tones are the only guide with eyes closed. The other choice ("ambient") kept music playing but went silent without any sign on silent phones. The cost: starting a session with sound on pauses music that is playing. With sound muted the app starts no audio at all, so music keeps playing. Safari 16 and older follow the silent switch either way.
- **Android: no silent switch.** Chrome plays the tones at media volume whatever the ring mode (silent, vibrate or normal). Vibration works whatever the volume.
- **Vibration** (Android): in 40 ms, top-up 20 ms, hold 12 ms, out two short buzzes, done three buzzes. Different enough to tell apart with the phone in a hand or a pocket.

## The Pattern screen (step 2)

- **One column on a phone:** technique name and its one-line wording at the top, time left and the menu in the top corner, the shape in the middle, then the phase word with its hint and the yellow count, then the controls, then the technique picker at the very bottom. Start and the picker are in thumb reach.
- **Controls:** Length on the left (opens a sheet), a big sun-yellow start button in the middle (play, pause, again), Sound on the right. Same arrangement as focus, so the two apps feel related without sharing any visuals.
- **Technique picker:** four equal buttons, each with a small copy of its shape over its name. The shape is the app's identity, so it is in the picker too. Resonant has a small lock. Keys 1 to 4 pick, Space starts and pauses.
- **Length sheet:** each length shows how many whole breaths it is ("5 min, 33 breaths"). Paid lengths are dashed with a lock and lead to the unlock page.
- **Type:** Outfit, self-hosted, Latin only (one file of about 30 KB). Names 800, phase word 750, count 400 in sun yellow. Every number uses tabular figures so the clock and count do not shake.
- **Tablet:** the same column, wider and with larger type. **Desktop:** the shape on the left, everything else in a column on the right.

## The shapes

- Built by `src/lib/shape.ts` from the rule: one side per phase, length in proportion to its seconds, in goes up, holds go across, out comes down, clockwise. Tests check exact proportions for all four techniques and for every custom pattern from 0 to 12 s.
- **Box** is a square. **4-7-8** is a triangle with sides exactly 4, 7 and 8, the hold flat along the top (the reference sketch tilted the hold; the spec says holds go across). **Cyclic sigh** is a steep 2 s climb, a gentler 1 s top-up, then a long curved 6 s slide back down: 2 + 1 cannot reach across 6 in straight lines, so the slide bows outward to exactly 6. **Resonant** is a leaf tilted up to the right, two equal curved sides.
- When straight sides can't close a custom shape with exact lengths, the longer side bows outward. If holds are longer than the breaths can span, the longer hold bows instead. Lengths always stay exact.
- Labels sit outside the middle of each side ("4 s", "5.5 s"). The side you are on turns white and bold.

## Motion

- The dot moves at an even speed along each side (measured by distance, also on curves). The finished part of the line is solid white; the rest is a faint track.
- A soft yellow halo around the dot grows as the lungs fill and shrinks as they empty, so breathing out looks slower and softer. The phase word fades in quickly for in and hold, slower (0.9 s) for out.
- **Switching technique** morphs one outline into the next over 0.7 s (240 points along each outline, eased). Labels fade out and back in.
- **First visit:** the shape draws itself once with the dot leading, about one breath long (4.5 to 8 s), each side's label appearing as that side is finished, next to "Follow the shape", one plain line on how to read it, and the safety text. Start answers it and begins the first session.
- **Session complete:** the whole shape is solid and fills softly with sun yellow, the dot rests at the start, and the words read "Session complete, 33 breaths in 4:57." The start button becomes Again. A finished preview says "Preview over" with a link to the unlock.
- **Reduced motion:** no morph, no word fade, no fill fade, and the first-run shape appears whole at once. The dot still moves, because it is the guide. Nothing flashes anywhere.

## App icon

- The cyclic sigh's shape in white on cobalt, with the yellow dot at its start. Made from the app's own shape code. `favicon.svg` (rounded), `icon-192.png`, `icon-512.png` (also the maskable icon: everything sits inside the middle 80%) and `apple-touch-icon.png`.

## Tried and changed

- **Resonant leaf width.** The first leaf was nearly round. The sides now span 88% of their length instead of 80%, which gives a clearer leaf.

## Science, privacy and first run (step 4)

- **Evidence label** under the wording on the breathing screen: a sun-outlined pill with an arrow ("Little research >"). It opens the science page scrolled to that technique. Same idea as focus, which Roger approved there.
- **Text pages** share the poster look: cobalt, white headings in Outfit 800, soft blue body text, sun-yellow label pills and a sun rule beside each source. Each technique on the science page is a card with its small shape, its label, its pattern in seconds, its wording, a plain note and its sources.
- **First run on small phones:** the wording line and evidence label are hidden while the first-run card is up, so the shape drawing itself stays large enough to read. The card links to the science page.

## Paid features (step 5)

- **Preview end:** when a locked technique's minute is up, the shape fades back to 30% over 1.4 s and the text reads "Preview over", the reason in one line, a white "See the lifetime unlock" button and "$4.99 once. No renewals." The Again button stays, so the preview can run again.
- **Your week:** Monday to Sunday as seven rows, today's name in sun yellow. Each finished session leaves its own small shape, filled softly with sun, in the order the sessions happened. A day with no session is just its name: no mark, no streak, no message. One plain line of totals on top ("4 sessions, 19 minutes"), and arrows to earlier weeks back to the oldest kept session. Free users see an example week in a dashed frame, labelled Example, and the offer.
- **Custom patterns:** the shape is drawn large and redrawn at once as you change a number, with each side labelled, the pattern's name ("4-2-6-2") and its pace ("4.3 breaths a minute"). Four rows of minus and plus buttons (48px) with the seconds in sun yellow. "Breathe this pattern" is always open; for free users it runs as a 1 minute preview. Saving needs the unlock. Saved patterns are listed with their shape, Breathe and Delete.
- **Unlock and restore pages** follow focus: the offer lists what the unlock adds, the price line, one sun-yellow button. After paying, the code sits on a white card with a copy button and "Save this code to unlock Breathwork on another device."
