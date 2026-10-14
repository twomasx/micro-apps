# Experiment 03: Breathwork

Path `/breathwork/`. Site port 3003, functions port 8803. Run with `pnpm dev:breathwork`.

A guided breathing timer. Pick a technique, press start, and follow the shape. Each technique is drawn as its own shape and a dot traces it, one side per phase: breathe in, hold, breathe out. The goal is a short daily habit people come back to.

## Design: Claude designs this one

As with focus, Roger has picked a direction and wants Claude to design and style it. The root CLAUDE.md rule "Roger owns design, no CSS" does not apply to the breathwork app. Roger reviews the design on his phone before anything else is built on it.

**Direction: Pattern.** Open `design/pattern-reference.html` in a browser and look at the second screen. It is a sketch, not a template. Copy the idea, not the code, and make it better.

- The shape is the one memorable thing. Box is a square. 4-7-8 is a triangle whose sides are 4, 7 and 8 long. The cyclic sigh is two short climbs and one long slide down. A bright dot traces the shape, the finished part of the line is solid, and each side is labeled with its seconds.
- General rule for every shape, including custom ones: one side per phase, side length in proportion to its seconds, breathing in goes up, holding goes across, breathing out comes down.
- Bold poster style. Colors from the reference: cobalt `#2341d6`, white `#f6f7fb`, soft blue `#b4c2ff` for secondary text, sun yellow `#ffd45c` for the dot, the count and the start button. Font: Outfit (self-host it, as focus does with its fonts).
- The phase word ("Inhale", "Hold", "Exhale") is big and bold, the seconds count down in yellow next to it, and a short hint sits under it ("Through your nose").
- Motion: the dot moves smoothly and evenly along each side. Switching technique morphs one shape into the next instead of cutting. Breathing out can feel slower and softer than breathing in.
- Things to explore and show Roger: the first-run moment where the shape draws itself once while explaining the technique; a "session complete" moment; how the shape and dot look on tablet and desktop, where there is more room.
- Phone first. The start button and technique picker stay in thumb reach.
- Keyboard: Space starts and pauses, keys 1 to 4 pick techniques.

Build the visual as a swappable theme: the breathing engine outputs the state (technique, phase, progress through the phase, how full the lungs are from 0 to 1) and the theme only draws it. Roger wants to add a second theme later ("Tide": the screen fills with water as you breathe in). Don't build Tide now, but don't make it hard to add.

Note design decisions and alternatives you tried in `DESIGN-NOTES.md`.

## Techniques

| Technique | Pattern | Wording |
| --- | --- | --- |
| Cyclic sigh | 2 s in through the nose, 1 s short top-up in, 6 s slowly out through the mouth | In one study, 5 minutes a day improved mood more than mindfulness meditation. |
| Box | 4 in, 4 hold, 4 out, 4 hold | Often used to steady yourself before something stressful. |
| 4-7-8 | 4 in, 7 hold, 8 out | Often used to wind down before sleep. |
| Resonant | 5.5 in, 5.5 out (about 6 breaths a minute) | Slow breathing at about 6 breaths a minute is the most studied pace for relaxation. |

- Techniques live in `src/data/techniques.json`, not in code. Resonant has no hold, so its shape is two curved sides (up, then down) making a lens or leaf shape.
- Each technique gets an evidence label: "Some research", "Mixed results" or "Little research", with 1 to 3 sources. **Research these yourself.** Start with Balban and others, 2023, Cell Reports Medicine ("Brief structured respiration practices enhance mood and reduce physiological arousal"), which compared cyclic sighing, box breathing and mindfulness. Don't guess. Show Roger the labels and sources before using them, and fix the wording in the table if the research says something different.

## Free and paid

Price lives in `config/products.json`: one product, `lifetime`, $4.99 (499 cents). The copy says "$4.99 once. No renewals."

| Free | Lifetime unlock |
| --- | --- |
| Cyclic sigh, Box and 4-7-8 | Resonant, plus custom patterns |
| Sessions of 1, 3 or 5 minutes | Sessions up to 20 minutes (10, 15, 20) |
| Sound and vibration at each phase change | Your week: every finished session leaves a small copy of its shape on a weekly view |
| Keeps the screen awake during a session | Save up to 5 custom patterns |

- Locked items get a preview, as in focus: a locked technique runs for one minute, then fades out and shows the unlock offer.
- Custom pattern builder: choose seconds for in, hold, out, hold (holds can be 0). The app draws its shape live as you change the numbers. Limits: each phase 0 to 12 seconds, breathing in and out at least 2 seconds each.
- The weekly view is the reason to come back. Each day shows the shapes of that day's sessions. Missing a day shows nothing, never a broken streak, a warning or a guilt message.
- No accounts. Use the same unlock code approach as focus: a code derived from the Stripe session, shown on the success page with "Save this code to unlock Breathwork on another device", stored on the device, checked by the server, and a Restore screen. If the code logic is the same as focus, it can move into `packages/payments`, but only if focus and personality tests still pass.

## The breathing engine (`src/lib/`)

- Pure timing logic, fully tested (Vitest): given a technique and elapsed time, return the phase, the progress through it, the seconds left in it and the lung level from 0 to 1. Custom pattern validation. Session length and free-tier limits.
- Time comes from real timestamps, never by counting frames, so it stays exact.
- **Sound cues, so it works with eyes closed:** a soft, short tone at each phase change, different for in, hold and out, generated with Web Audio. On by default, with a mute switch. Volume low.
- **Vibration** at each phase change on Android (Vibration API). iPhone Safari has no vibration. Skip it there without errors.
- **Screen Wake Lock API** keeps the screen on during a session, and is released on pause or finish.
- When the page is hidden, pause the session and say so when the user returns ("Paused while you were away"). Don't keep counting in the background.

## Safety

- First-run screen and science page: "Breathe gently. If you feel dizzy or lightheaded, stop and breathe normally. Don't practice breath holds while driving, in water, or anywhere fainting would be dangerous. If you are pregnant or have a heart or lung condition, check with a doctor first."
- No flashing anywhere. Respect `prefers-reduced-motion`: the dot still moves (it is the guide) but morphs and other motion are cut.

## Honest claims

- Say "studies have found", "often used for". Never "cures anxiety", "treats", "rewires", "clinically proven" or "hacks your nervous system".
- The science page explains each technique, its evidence label and sources, and the safety notes.

## Screens (routes under /breathwork/)

| Route | What it does |
| --- | --- |
| `/` | The breathing screen. First visit shows the safety line and the first-run shape draw. |
| `/week` | Your week (paid; free users see what it looks like and the unlock offer). |
| `/custom` | Custom pattern builder (paid, same preview rule). |
| `/unlock` | What the lifetime unlock adds, the price, the buy button. Stripe returns here. |
| `/restore` | Enter an unlock code. |
| `/science` | Techniques, evidence, sources, safety. |
| `/privacy` | What is stored. |

## API and data

Same shape as focus: `GET /api/health`, `POST /api/checkout`, `POST /api/stripe/webhook`, `GET /api/unlock/:code`, `GET /api/purchase/:sessionId`. D1 table `purchases` as in focus. Session history and custom patterns stay on the device (IndexedDB, key prefix `breathwork:`), never on the server.

## Build order

1. Breathing engine, sound cues, vibration, wake lock and tests, on a bare test page. **Stop so Roger can try it on his phone.**
2. The Pattern breathing screen: all four shapes, morphing, first-run draw, session complete. **Stop so Roger can review the design on his phone.** Iterate with him here.
3. Evidence research for each technique. **Stop and show Roger the labels and sources.**
4. Science, privacy and first-run content.
5. Paid features (week view, custom patterns, longer sessions, previews) and payments.
6. Root "Done means" checks.
7. Deploy following DEPLOY.md (new Pages project, D1, secrets, add breathwork to the router's live apps, Stripe webhook). Add a link to breathwork on the home page.

Commit after each step.

## Later (not this week)

- The Tide theme as a second look you can switch to.
- A Focus plus Breathwork bundle at $9.99.
