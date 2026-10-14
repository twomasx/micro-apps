# Experiment 02: Focus

Path `/focus/`. Site port 3002, functions port 8802. Run with `pnpm dev:focus`.

A binaural beat player. Pick a preset, put headphones on, start a session. Each ear gets a slightly different tone and you hear the difference as a slow pulse (the beat). Tones are generated live in the browser with the Web Audio API. No audio files.

## Design: Claude designs this one

For this app Roger has picked a direction and wants Claude to design and style it. The root CLAUDE.md rule "Roger owns design, no CSS" does not apply to the focus app. Roger reviews the design on his phone before anything else is built on it.

**Direction: Orbit.** Use `design/orbit-reference.html` (open it in a browser) for the feel. It is a sketch, not a template. Copy the idea, not the code, and make it better.

- Two points of light orbit each other in a deep blue-black starfield. One star is the left ear, one is the right. One full orbit is one beat (slowed, see Safety).
- The orbit is the one memorable thing on the screen. Everything else stays quiet and out of its way.
- The session timer is part of the orbit: a faint ring around it that fills as the session runs, or the stars' trail, or something better you come up with.
- The preset name is large and elegant. The reference uses a large serif (Cormorant). Change it if you find something better.
- Colors from the reference: background around `#080a1c` to `#141a3d`, star cream `#f3ebdd`, soft gold `#e6c88f`, muted lavender `#9ea3c4` for secondary text. Calm, spacey, not neon.
- Keep the "Headphones on" indicator from the reference's Scope option: a small glowing dot with plain text, top of the screen. It is a reminder only. The app does not check for headphones (see below).
- Motion is slow and continuous. Transitions between presets are smooth: the orbit speed eases to its new rate over a second or two, it never jumps.
- Things to explore and show Roger: the stars reacting gently when you start and stop; a soft change in the starfield or orbit color per preset; what the screen does in the last minute of a session; a "session complete" moment.
- Phone first. On tablet and desktop the orbit gets more room. The controls stay where a thumb reaches on phone and stay simple on desktop.
- Keyboard: Space plays and pauses, keys 1 to 5 pick presets.

Note design decisions and alternatives you tried in `DESIGN-NOTES.md` so Roger can see the options.

## Presets

| Preset | Beat | Carrier (left ear) | Wording |
| --- | --- | --- | --- |
| Sleep | 2 Hz | 250 Hz | Often used to wind down before sleep. |
| Calm | 6 Hz | 300 Hz | Often used for meditation and relaxation. |
| Relaxed focus | 10 Hz | 300 Hz | Often used for calm, steady attention. |
| Focus | 18 Hz | 350 Hz | Often used for active work and concentration. |
| Deep focus | 40 Hz | 400 Hz | Studied for attention and memory. |

- Right ear = carrier + beat. Keep carriers between 250 and 450 Hz.
- Presets live in `src/data/presets.json`, not in code.
- Each preset gets an evidence label: "Some research", "Mixed results" or "Little research". **Research these yourself** (search for studies on binaural beats at each range) and put the label and 1 to 3 sources per preset in `presets.json`. If you can't find a study for a range, the label is "Little research". Don't guess. Show Roger the labels and sources before using them.

## Free and paid

Price lives in `config/products.json`: one product, `lifetime`, $6.99 (699 cents). The copy says "$6.99 once. No renewals."

| Free | Lifetime unlock |
| --- | --- |
| Sleep, Calm and Focus presets | All five presets, plus a custom beat rate from 1 to 40 Hz |
| Sessions up to 10 minutes | Any length up to 90 minutes |
| Prime mode at 10 minutes | Prime mode at 10, 15 or 20 minutes |
| | Optional soft noise layer (pink or brown noise) under the tones |
| | Session history on this device |

No accounts. After purchase the server creates a random unlock code (at least 12 characters) tied to the Stripe session. The success screen shows the code with "Save this code to unlock Focus on another device." The client stores it in IndexedDB. A "Restore purchase" screen takes the code and checks it with the server.

## Prime mode

The research found that listening **before** a task worked better than listening during it, and longer sessions worked better. Prime mode is a session you do right before you start work. At the end it says plainly: "Prime complete. Start your work now." Make this the main call to action on first visit.

## Headphones reminder

Browsers can't detect headphones, and the app does not test for them. The "Headphones on" dot and text at the top of the player is a reminder only. Before the first session, show one line: "Put your headphones on. Binaural beats only work with headphones."

## Audio engine (`src/lib/audio.ts`)

- Two sine oscillators, one per ear. Send them to strictly separate left and right channels (a `ChannelMergerNode`), so nothing leaks between ears.
- Fade in and out over about 2 seconds. No clicks when starting, stopping, changing presets or changing volume.
- Volume control, starting low (about 30%).
- Changing preset glides the frequencies over about 1.5 seconds.
- Optional noise layer (paid): pink or brown noise generated in code, quiet, its own volume.
- Keep playing with the screen off and the tab in the background on Android Chrome. Route the output through a `MediaStreamAudioDestinationNode` into an `<audio>` element if that is what it takes, and add the Media Session API so play and pause show on the lock screen. Test this on Android. Note in `DESIGN-NOTES.md` how iPhone Safari behaves.
- The session timer counts real elapsed time, so it stays correct after the screen has been off.
- Unit tests (Vitest) for the frequency math, the timer and the free-tier limits.

## Safety

- **Visuals never flash or pulse at the beat rate.** Flashing at 3 to 30 Hz can trigger seizures in people with photosensitive epilepsy. Visual motion runs at a slowed rate, at most 0.6 cycles per second, for every preset.
- Respect `prefers-reduced-motion`: the orbit moves very slowly or holds still.
- Pause animation when the page is hidden. Keep audio playing.
- The science page and first-run screen say: "Don't use while driving or doing anything that needs your full attention. If you have epilepsy or a seizure disorder, check with a doctor first."

## Honest claims

- Say "often used for" and "studies have tested". Never "puts your brain in alpha", "syncs your brainwaves", "boosts IQ", "rewires" or "clinically proven".
- The science page says: a 2019 meta-analysis of 22 studies (Garcia-Argibay, Santed and Reales, Psychological Research) found a medium effect (g = 0.45) on memory, attention, anxiety and pain perception. Listening before a task worked better than during it, and longer exposure worked better. Results vary a lot between studies, and the idea that a beat makes your brain match its frequency is not well supported.
- Each preset's evidence label and sources are listed on the science page.

## Screens (routes under /focus/)

| Route | What it does |
| --- | --- |
| `/` | The player (Orbit). First visit offers Prime mode and shows the headphones line. |
| `/unlock` | What the lifetime unlock adds, the price, the buy button. |
| `/restore` | Enter an unlock code. |
| `/science` | How it works, the meta-analysis, evidence per preset, safety. |
| `/privacy` | What is stored. |

## API (Pages Functions in `functions/api/`)

| Method and path | Does |
| --- | --- |
| `GET /api/health` | `{ "ok": true }` |
| `POST /api/checkout` | Returns the Stripe Checkout URL for `lifetime` through `packages/payments`. |
| `POST /api/stripe/webhook` | Verifies the signature, records the purchase, creates the unlock code. Safe to receive twice. |
| `GET /api/unlock/:code` | `{ valid: true/false }` |
| `GET /api/purchase/:sessionId` | For the success page: confirms payment and returns the unlock code. |

D1 table `purchases`: id, stripe_session_id (unique), unlock_code_hash, amount_cents, currency, status, created_at. Store only a hash of the unlock code. Session history stays on the device (IndexedDB, key prefix `focus:`), never on the server.

## Build order

1. Audio engine and tests, with a test page that has left-only and right-only tones and a switch between the two audio routes. The test page does not ship. **Stop so Roger can listen on his phone with headphones.**
2. The Orbit player: presets, timer, Prime mode, volume, Media Session. **Stop so Roger can review the design on his phone.** Iterate with him here.
3. Evidence research for each preset. **Stop and show Roger the labels and sources.**
4. Science, privacy and first-run content.
5. Payments: checkout, webhook, unlock code, restore, free-tier limits.
6. Root "Done means" checks.
7. Deploy following DEPLOY.md (new Pages project, D1, secrets, router route for /focus/, Stripe webhook).

Commit after each step.
