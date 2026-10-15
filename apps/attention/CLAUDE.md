# Experiment 04: Attention

Path `/attention/`. Site port 3004, functions port 8804. Run with `pnpm dev:attention`.

An attention training app with a built-in attention test. This replaces the skeleton's one-line description ("2 minute SART test"): the test is still here, but the main product is now the training.

- **Train:** close your eyes and keep your attention on your breath for a short stretch. A bell asks if you stayed with it. Yes makes the next stretch a little longer, no makes it a little shorter. Over weeks, stretches grow from seconds to minutes.
- **Measure:** a standard sustained attention test (the SART), taken before training and once a week, so progress is measured honestly instead of claimed.

## The science (the app must stay inside this)

- The training follows MediTrain: Ziegler, Gazzaley and others, 2019, *Nature Human Behaviour*, "Closed-loop digital meditation improves sustained attention in young adults". 59 adults aged 18 to 35, randomized against a placebo app, 6 weeks. Focus stretches grew from about 20 seconds on day one to about 6 minutes by day 30. The trained group was more consistent on sustained attention tests and better on working memory, with matching EEG changes. Participants practiced about 20 to 30 minutes a day.
- **Read the paper before building** and match its method where the spec is unclear: starting length, how much a stretch changes after yes and no, and how sessions were structured. Write what you found in `DESIGN-NOTES.md`. Where the paper differs from the numbers below, follow the paper and tell Roger.
- The test follows the standard SART: Robertson and others, 1997. Details below.
- Our additions (the tick probes, and the before-and-after test) are **experimental**. The app labels them that way.

## Design: Claude designs this one

As with focus and breathwork, Roger picked a direction and wants Claude to design and style it. The root CLAUDE.md rule "Roger owns design, no CSS" does not apply to the attention app. Roger reviews the design on his phone before anything else is built on it.

**Direction: Ink.** Open `design/ink-reference.html` in a browser. It is a sketch, not a template. Copy the idea, not the code, and make it better.

- Sumi ink on cool paper. Paper `#f3f3ef`, ink `#191919`, gray `#77756f` for secondary text and drifted strokes. No other colors. No red seal or colored tags.
- Fonts: Shippori Mincho for headings and numbers, Zen Kaku Gothic New for everything else. Self-host Latin subsets, as the other apps do.
- During a stretch, a brush slowly draws an enso (the Zen circle) over the length of the stretch. Held: the circle stays in ink. Drifted: it fades to gray. Each session leaves a row of small circles, one per stretch.
- Day mark, top right: a thin hand-drawn open circle with the day number inside and "of 30" underneath. Keep this exact idea.
- The brush stroke should feel hand-made: varying width, slight wobble, a dry-brush end. Canvas or SVG, your choice.
- The screen should be very calm during a stretch, since eyes are closed. Consider dimming the page slightly while a stretch runs.
- Things to explore and show Roger: the session-complete moment; a progress page that shows weeks of circles like a scroll; test results drawn as an ink line; how the circle looks on tablet and desktop.
- Phone first. The yes and no buttons are large, at the bottom, easy to hit right after opening your eyes.

Note design decisions and alternatives you tried in `DESIGN-NOTES.md`.

## Training

**The loop**

1. A low, soft "tok" sound means a stretch has begun. Vibrate `[15, 60, 15]` on Android.
2. The user keeps attention on the breath, eyes closed.
3. At the end, a bright soft bell plays (vibrate once) and the screen asks: "Did you stay with your breath the whole time?" with two buttons: "I drifted" and "I stayed".
4. Next stretch length: after "I stayed", longer; after "I drifted", shorter. As in the paper: first stretch 20 s, up 10% (at least 1 s), down 20%. Our limits: never below 10 s or above 10 minutes.
5. About 3 seconds after answering, the next stretch starts with the "tok".

**Sessions**

- A session is measured in focus time (the sum of stretch lengths), not clock time. Session sizes: 10, 15 or 20 minutes of focus time, or "Follow the study schedule": 20 minutes in weeks 1 and 2 (practice days 1 to 10), 25 in weeks 3 and 4 (days 11 to 20), 30 in weeks 5 and 6 (days 21 to 30 and after). When the target is reached, the current stretch finishes and the session ends.
- The next session starts at the level the last one reached, with no warm-up, as in the paper.
- First session: short plain instructions on screen. "Sit comfortably. Close your eyes. Rest your attention on the feeling of your breath. When you notice your mind has wandered, that is normal. Answer honestly when the bell rings."
- Keep the screen awake during a session (Screen Wake Lock). If the page is hidden, pause the session and say so when the user returns.
- Missing days never shows a broken streak, a warning or guilt. "Day 1 of 30" counts practice days, not calendar days. The study had 30 practice days: 5 a week for 6 weeks.

**Sounds** (Web Audio, generated in code, no audio files)

| Sound | When | Character |
| --- | --- | --- |
| Tok | A stretch begins | Low (around 196 Hz), soft, short, wooden |
| Bell | A stretch ends | Brighter, gentle, about 2 seconds of ring |
| Tick | Experimental probe (below) | Very quiet, very short, clearly different from both |

One volume setting for all three. Sounds must work with the phone speaker and with headphones.

**Experimental: tick probes**

Self-report can be wrong, so in about 1 in 4 stretches a very quiet tick plays at a random moment (not in the first or last 3 seconds). If the user notices it, they tap anywhere on the screen. Noticing it suggests attention was present. The stretch keeps going either way.

- Probes never change stretch length. The yes and no answers alone drive the training, as in the study.
- Show the probe result only in summaries ("You noticed 3 of 4 ticks"), labeled "Experimental".
- A settings switch turns probes off.

## The attention test (SART)

**Standard rules**

- Digits 1 to 9 appear one at a time in the center. Tap for every digit except 3. Don't tap for 3.
- Each digit shows for 250 ms, followed by a 900 ms mask: a circle with an X through it, drawn as a thin ink line. Next digit right after. No feedback during the test.
- Five font sizes, chosen at random for each digit, scaled to the screen.
- Order: random, with each digit appearing equally often.
- Taps under 100 ms after the digit appears count as anticipations, not responses. Record them separately.

**Lengths**

- Quick: 108 digits (each digit 12 times, 12 of them 3s), about 2 minutes.
- Full: 225 digits (each digit 25 times), about 4.3 minutes. This is the standard research length.
- Before the first test: an 18-digit practice round with feedback after each digit ("Correct" or "That was a 3, don't tap").

**Scores**

- Taps on a 3 (commission errors): the main score.
- Missed taps (omission errors).
- Average reaction time on correct taps, and how much it varied (standard deviation and coefficient of variation).
- One summary number for the screen, called "Attention score", built from the above. Explain in the science page exactly how it is calculated.

**When to take it**

- Prompt for a baseline before the first training session.
- Prompt once a week during the program (after practice days 5, 10, 15, 20, 25 and 30).
- The test is always free and can be taken any time.
- Results over time: a simple ink line chart. When showing change, say plainly: "Scores usually rise a little on a second test just from practice. Compare with your first few results, not just the last one."

**Percentiles**

- Shown as "compared with people who took it here", per test length. Only show them once there are at least 200 first-time results for that length. Before that, show nothing instead of a weak number.
- Only first tests count toward percentiles, so repeat takers don't skew them. The client sends which number test this is for that device.
- Note on the results screen: "Phone screens add small timing delays, so your times are best compared with your own earlier results."

## Free and paid

Price lives in `config/products.json`: one product, `lifetime`, $6.99 (699 cents). The copy says "$6.99 once. No renewals."

| Free | Lifetime unlock |
| --- | --- |
| The attention test, any time, both lengths | The full 30-day program and beyond |
| Training days 1 to 5 | Session sizes 10, 15 and 20 minutes, and "Follow the study schedule" (free is 10) |
| Tick probes | Full progress history: every session's circles, longest stretch by day, all test results |

- After day 5 the free user can still take the test and sees the unlock offer when starting a session.
- Unlock code, restore screen and checkout exactly as in focus and breathwork, through `packages/payments`.

## Honest claims

- Allowed: "In a controlled study, 6 weeks of training like this improved sustained attention and working memory in adults aged 18 to 35." Link the paper.
- Never: "boosts IQ", "rewires your brain", "clinically proven", "cures", "treats ADHD", or any claim about ADHD, children or medical conditions. Add on the science page: "This is not a medical device or a treatment for ADHD or any condition."
- Don't promise results. Say what the study found and invite the user to measure their own with the test.

## Screens (routes under /attention/)

| Route | What it does |
| --- | --- |
| `/` | Today: day mark, start a session, the last session's circles, a prompt for this week's test when due. |
| `/session` | The training loop. |
| `/test` | Choose Quick or Full, practice round the first time, the test, the result. |
| `/progress` | History: circles by day, longest stretch over time, test results line (paid beyond day 5). |
| `/unlock` | What the unlock adds, the price, the buy button. Stripe returns here. |
| `/restore` | Enter an unlock code. |
| `/science` | The study, how the training adapts, the SART, how the score is calculated, what is experimental. |
| `/privacy` | What is stored. |

## API and data

- Same payment routes as focus: `GET /api/health`, `POST /api/checkout`, `POST /api/stripe/webhook`, `GET /api/unlock/:code`, `GET /api/purchase/:sessionId`.
- `POST /api/tests`: anonymous test summary (version, length, nth test on this device, commissions, omissions, anticipations, mean RT, SD RT, CV, score). No names, no device ID, no IP stored.
- `GET /api/norms?length=quick|full`: the percentile table built from first tests, cached for an hour. Returns nothing usable until there are 200 results.
- D1 tables: `purchases` (as in focus) and `test_results`.
- Training sessions, answers, probes and per-digit test data stay on the device (IndexedDB, key prefix `attention:`).

## Build order

1. Read the MediTrain paper and write its method into `DESIGN-NOTES.md`. Then the pure logic with Vitest tests: the stretch staircase, session focus-time totals, the SART sequence builder (equal digit counts, sizes, 3s), SART scoring (commissions, omissions, anticipations, RT, SD, CV, score), and free-tier limits. Plus the three sounds, vibration and wake lock, on a bare test page. **Stop: show Roger the method notes and let him try the sounds.**
2. The Ink training screens: today, session, session complete. **Stop so Roger can review the design on his phone.** Iterate with him here.
3. The test: practice, Quick and Full, results, in the same Ink style. Check the timing (250 ms and 900 ms) in a real browser and report how close it is.
4. Progress page, weekly test prompts, science and privacy content.
5. Payments, free-tier limits and the unlock offer.
6. Server: test results and norms.
7. Root "Done means" checks.
8. Deploy following DEPLOY.md (new Pages project, D1, secrets, add attention to the router's live apps, Stripe webhook). Add attention to the home page.

Commit after each step.

## Later (not this week)

- Guided intro audio recorded by Roger for the first session.
- A night mode with dark paper.
- Links from the test result to Focus and Breathwork ("Try a Focus prime, then test again").
