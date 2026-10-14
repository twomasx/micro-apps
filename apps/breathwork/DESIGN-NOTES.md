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
