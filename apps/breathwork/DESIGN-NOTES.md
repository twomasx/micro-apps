# Breathwork design notes

Direction: Pattern. This file lists what was decided and why, and what else was tried. Open questions for Roger are in `DESIGN-TODO.md`.

## Timing and cues (decided in step 1)

Roger asked for the choices that best fit how breathwork is actually practiced.

- **Sessions are whole breaths.** A practice ends after a complete breath, on the out-breath (or the empty hold in Box), never cut off halfway. Lengths are rounded to the nearest whole breath: 5 minutes of the cyclic sigh is 33 breaths (4:57), 1 minute of Box is 4 breaths (1:04). The clock shows the rounded time. The one minute preview is rounded the same way (Resonant: 55 s).
- **The count is the seconds you follow.** It counts whole seconds down to 1 as the phase ends, never 0. Resonant's 5.5 s phases count 5, 4, 3, 2, 1: the 5 holds the extra half second, so each later number lasts exactly one second and the 1 always lands on the change. Counting up from 6 was tried, but the 6 showed for half a second, like a skipped beat.
- **Tones follow the breath.** In rises (440 to 587 Hz, 0.4 s). The cyclic sigh's top-up is a shorter, higher rise, so the double breath can be heard with eyes closed. Hold is one level note. Out falls and is longer and softer (494 to 370 Hz, 0.7 s, slower fade in), matching a slow exhale. "Done" is one long, quiet note. Each tone marks the start of its phase.
- **iPhone: tones play through the silent switch.** iPhones have no vibration, so on a phone kept on silent the tones are the only guide with eyes closed. The other choice ("ambient") kept music playing but went silent without any sign on silent phones. The cost: starting a session with sound on pauses music that is playing. With sound muted the app starts no audio at all, so music keeps playing. Safari 16 and older follow the silent switch either way.
- **Android: no silent switch.** Chrome plays the tones at media volume whatever the ring mode (silent, vibrate or normal). Vibration works whatever the volume.
- **Vibration** (Android): in 40 ms, top-up 20 ms, hold 12 ms, out two short buzzes, done three buzzes. Different enough to tell apart with the phone in a hand or a pocket.
