# Attention: design notes

What was decided, and why. Open questions for Roger are in `DESIGN-TODO.md`.

## The training method, from the paper

Source: Ziegler, D. A., Simon, A. J., Gallen, C. L., Skinner, S., Janowich, J. R., Volponi, J. J., Rolle, C. E., Mishra, J., Kornfield, J., Anguera, J. A. and Gazzaley, A. (2019). Closed-loop digital meditation improves sustained attention in young adults. *Nature Human Behaviour*, 3, 746 to 757. doi:10.1038/s41562-019-0611-9. Read from the author manuscript on the NSF public access repository (par.nsf.gov/servlets/purl/10163641).

What the paper says (Methods, "MediTrain"):

- **The task.** Eyes closed, attention on the breath (air in the nostrils or the chest moving). When the mind wanders, notice it and bring attention back to the breath.
- **The question.** At the end of each trial, participants pressed a button to say whether their attention stayed on the breath the whole trial, "or whether their attention was diverted, even once".
- **First trial: 20 s.** Chosen from pilot testing.
- **After a yes: next trial 10% longer.**
- **After a no: next trial 20% shorter.**
- **No warm-up.** "The next session begins at the level attained at the end of the previous session", including on the next day.
- **Limits.** The paper gives no minimum or maximum.
- **Dose.** Both groups trained 5 days a week for 6 weeks (30 training days): 20 minutes a day in weeks 1 and 2, 25 in weeks 3 and 4, 30 in weeks 5 and 6. The paper calls this engagement time.
- **Result in the app.** About 20 s on the first day to an average of about 6 min after 25 days.
- **Outcome measures.** The main measure was reaction time variability (RTVar) on the TOVA, a continuous performance test, not the SART. Working memory improved on a change detection task. EEG showed matching changes. Analysed sample: 22 in MediTrain and 20 in the placebo group, from 59 randomized.

## What the app does, and where it differs from the paper

Roger chose on 2026-10-15 to follow the paper on every method point.

| Point | Paper | App |
| --- | --- | --- |
| First stretch | 20 s | 20 s |
| After "I stayed" | +10% | +10%, at least 1 s, rounded to whole seconds |
| After "I drifted" | −20% | −20%, rounded to whole seconds |
| Next session | starts where the last ended | the same |
| Floor and ceiling | not given | 10 s and 10 min (ours) |
| Program | 30 days, 5 a week for 6 weeks | "Day N of 30". Practice days, not calendar days |
| Daily amount | 20, then 25, then 30 min | 10, 15 or 20 min of focus time, or "Follow the study schedule" (20, 25, 30 by program week; paid) |
| Measure | TOVA (RT variability) | SART, with the CV of reaction time as part of the score |

Whole seconds: the paper does not say how lengths were rounded. Whole seconds keep the numbers on screen exact ("Held 0:24"). At short lengths +10% would round to no change, so a yes always adds at least 1 s.

The daily amount in the study is time with the app, which includes the answer and the pause between trials. Ours counts only focus time, so a 20 minute session takes a little longer on the clock. The science page says the study practiced 20 to 30 minutes a day.

Study schedule weeks map to practice days: days 1 to 10 are weeks 1 and 2, days 11 to 20 are weeks 3 and 4, days 21 and on are weeks 5 and 6.

## Our additions (labeled experimental in the app)

- **Tick probes.** In about 1 in 4 stretches, a very quiet tick at a random moment, not in the first or last 3 s. Tapping after it counts as noticed. Taps before the tick are counted separately (they are not a "notice"). Probes never change the stretch length.
- **The SART before and during training.** The study used a different test. Our test measures a related thing (keeping attention on a dull task), so the science page says so.

## The attention test (SART)

Robertson, I. H., Manly, T., Andrade, J., Baddeley, B. T. and Yiend, J. (1997). "Oops!": performance correlates of everyday attentional failures in traumatic brain injured and normal subjects. *Neuropsychologia*, 35(6), 747 to 758.

- Digits 1 to 9, 250 ms each, then a 900 ms mask. Tap for every digit except 3.
- Five font sizes, picked at random for each digit. The original used 48, 72, 94, 100 and 120 point type. The app keeps those ratios and scales them to the screen.
- Quick: 108 digits (12 of each). Full: 225 digits (25 of each). Practice: 18 digits (2 of each), with feedback.
- A tap within 100 ms of a digit appearing is an anticipation: counted, but not a response. Only the first tap after that counts for the trial.

### How the attention score is calculated

A number from 0 to 100, from three parts:

- **Holding back on 3s, 50 points:** 50 × (share of 3s not tapped).
- **Not missing digits, 25 points:** 25 × (share of other digits tapped).
- **Steady timing, 25 points:** 25 × steadiness. Steadiness comes from the coefficient of variation (CV) of reaction times on correct taps: CV is the standard deviation divided by the mean. CV 0.10 or lower gives full points, CV 0.45 or higher gives none, straight line between.

Rounded to a whole number. Commission errors are the classic SART measure, so they carry half the score. Steadiness is included because reaction time variability was the study's main outcome. A CV around 0.2 to 0.3 is common, so a typical careful result lands in the 70s or 80s.

## Sounds

All generated with Web Audio. No audio files.

- **Tok:** a 196 Hz tone that drops slightly in pitch, plus quieter partials at 2× and 3×, and a very short knock of filtered noise. Phone speakers barely play 196 Hz, so the upper partials and the knock carry it on the speaker. Headphones get the full low body. About 0.35 s.
- **Bell:** a struck-bell spectrum (partials at 1, 2.76 and 5.4 times 880 Hz), with higher partials dying faster. About 2 s of ring.
- **Tick:** 12 ms of noise through a band-pass at 3.5 kHz, at about 1/6 of the tok's level. Nothing tonal, so it can't be confused with the other two.
- One volume for all three. The tick follows the volume too, so it stays "very quiet" relative to the others.

Vibration (Android): tok `[15, 60, 15]`, bell `40`. The tick does not vibrate: a buzz would make the probe something you feel, not something you notice.

## Ink: the design (step 2)

**Colors.** Paper `#f3f3ef`, ink `#191919`, gray `#77756f`. Nothing else. Hairlines, the stretch dimming and the sheet backdrop are ink at low strength, not new colors.

**Type.** Shippori Mincho (500 and 700) for headings, numbers and the bell's question. Zen Kaku Gothic New (400, 500 and 700) for everything else. Latin subsets only, self-hosted through Fontsource, about 86 KB of woff2 in total.

**The brush.** Canvas, not SVG. A dry-brush tail needs hundreds of broken hairlines, which canvas draws cheaply and SVG would turn into a large DOM. Each stroke is built from a seed, so the same stretch always draws the same circle: the big one during the stretch, the small one in the row, and later the progress page.

- *Shape.* About 86% to 93% of a circle, starting low on the left and running clockwise, as most enso are brushed. The open gap sits at the lower left. The radius wobbles gently (three slow sine waves) and the hand drifts slightly inward as it closes.
- *Width.* The brush lands narrow, presses wider just after, then swells and thins with slow noise, about ±17%. The edges are ragged by a few percent.
- *Ink.* The first ~42% is one solid wet body. After that the body narrows toward the middle while separate bristles take over from the edges, so there is no seam. Each bristle holds a different amount of ink, breaks into streaks of its own length, and runs out at its own point. The edges run dry first, as with a real brush.
- *Tried and dropped.* All bristles from the start: the body showed fine parallel lines and looked like a vector stroke. Short regular breaks: read as a dashed line, not dry brush. Bristles on the body's edge: they widened the stroke in a visible step where the dry part began. A separate dot where the brush lands: on gray circles two semi-transparent fills overlapped into a darker bead, so the dot is now part of the body path.
- *Small circles* keep more of their tail and use a thicker hair, or the tail falls under a pixel and they read as the letter C.
- *Held and drifted.* Held stays in ink. Drifted fades over 1.4 s to gray and a lighter strength, so it still reads as brushwork.

**During a stretch.** The page dims by 7% ink over 2.4 s and the top bar and row fade to 35%. Only the brush is drawn: Roger dropped the faint pencil guide circle on 2026-10-15 ("I just like to see the brush strokes"). The brush redraws only when it has moved about a pixel, so a 5 minute stretch costs almost nothing in battery. At the bell the page brightens in 0.8 s: dimming slowly suits closing your eyes, but opening them should not wait on the screen.

**Answer buttons.** "I drifted" (outlined) on the left, "I stayed" (filled) on the right, both 64 px tall at the bottom, where a thumb lands right after opening your eyes. Same order as the reference.

**Today.** Title, day mark, your last session's final circle (held in ink, drifted in gray) with the next stretch length inside it, or a sample enso before the first session, the last session's circles, the test prompt when one is due, then the size choice and Begin. Missed days are never mentioned.

**Session complete.** Every circle from the session in one wrapped line between two hairlines, like a line of brushwork, then three facts in large Mincho numbers: stretches held, longest held, and where the next session starts. The tick result follows with an "Experimental" tag.

**Tablet and desktop.** The same single column, centered. The circle grows with the screen up to 620 px (sized by the screen's height on wide screens, so it never pushes the buttons off). On desktop during a stretch, the circle sits alone in the middle with nothing else at full strength.

**App icon.** One enso by the same brush on paper, inside the middle 80% so it also works as a maskable Android icon.

## The attention test (step 3)

**Timing.** The test runs on a fixed schedule: digit `i` is due at start + 1.2 s + i × 1150 ms. Each animation frame checks what should be on screen and switches when less than half a frame is left, so every change lands on the frame closest to its target and rounding never adds up into drift. The digit, mask and feedback are written straight to the page on each frame, with no React render in between. Taps use the browser's own event time stamps, which share a clock with the frame times.

Measured in Chromium (headless, 60 Hz), Quick test, 108 digits, 2026-10-15:

| | Target | Measured |
| --- | --- | --- |
| Digit on screen, average | 250 ms | 250.0 ms |
| Digit on screen, worst | 250 ms | 0.1 ms off |
| One digit to the next, average | 1150 ms | 1150.0 ms |
| Furthest any digit started from its planned time | 0 | 5 ms |

These are frame times: when the browser started drawing a frame, not when light left the screen. A real screen adds a short, roughly constant delay (one or two frames), which shifts reaction times without changing their spread. That is why the result screen says times are best compared with your own earlier results. At 60 Hz, 250 ms is exactly 15 frames. On 90 Hz and 120 Hz phones it is 22.5 and 30 frames, so a digit shows for 244 to 256 ms on a 90 Hz screen. Every result keeps its own timing figures, shown under "Timing on this screen".

**Tap rules.** A tap belongs to the digit on screen when it happened. A tap time-stamped a moment before the frame that showed the next digit counts for the digit before. Taps in the lead-in and during practice feedback are ignored. Leaving the app or pressing Stop throws the run away: a test with a gap in it can't be scored fairly.

**Look.** Digits in Shippori Mincho, five sizes from 40% to 100% of the largest (which is 60% of the screen width, at most 340 px). The original used a Symbol typeface. The mask is a thin ink circle with an X, drawn as a plain line rather than a brush stroke, so it reads the same every time and never competes with the digits. Nothing else is on screen during the test except a small Stop link.

**Result.** The attention score in large Mincho inside a full brush enso, then the parts it is built from, with taps on a 3 first and marked as the main measure.

## Progress, science and privacy (step 4)

**Progress reads like a hand scroll.** Charts first (the longest stretch held by day, then each test length's scores), then every circle, day by day, in program weeks of 5 practice days as in the study. Each day is a thin rule, the day number in Mincho, its date in gray, then all its circles in one wrapped block. Days without practice don't appear, so there are never gaps or missed-day marks.

**One canvas per day, not one per circle.** Thirty days can hold over a thousand circles. Each day's block is a single canvas, drawn only once it scrolls into view, and small circles use a lighter stroke (140 samples, 7 bristles) that looks the same at 22 px.

**Ink line charts.** The same brush as the enso, drawn along a smooth curve through the values: a press at the start, a slight hand wobble, ragged edges and a short dry end. Ink dots (8 px) mark each value. Following charting practice: one series per chart, so the heading names it and there is no legend. One axis. A faint baseline. Only the first, highest and last values are printed, and an end label moves below its dot when the line rises away from it, so the line never runs through it. Tap or hover anywhere to read any value, with a ring on the chosen dot. "Show the numbers" opens a plain table, which screen readers also get.

**Scales.** Stretch lengths start at zero, so twice as long sits twice as high. Scores use a window in steps of 10 around your results (at least 20 points tall, inside 0 to 100), so a real change of a few points is visible without filling the chart.

**Science page.** Every number is from the paper, and each chance figure is in plain words ("about 1 time in 60"). It says where we differ from the study: daily time, the test used (SART, not the TOVA), and what is ours (the limits, tick probes, weekly tests). A test keeps the worked score example in step with the scoring code.

## Payments (step 5)

Same as breathwork: Stripe Checkout through `packages/payments`, the unlock confirmed only by the server (the webhook, or the return page asking Stripe directly), a 16-character unlock code made from the purchase, and a restore page. Nothing in `packages/` changed.

**Free:** the test (both lengths), the tick probes, practice days 1 to 5 with 10 minute sessions, and the history of those days with the latest test. **Unlock ($6.99 once):** every day after day 5, 15 and 20 minute sessions and the study schedule, and the full history.

From practice day 6 a free user's Today shows the offer where Begin was, with the test still one tap away. Opening `/session` directly shows the same offer. The paid session sizes stay visible but grayed, with one line about the unlock. A saved paid size falls back to 10 minutes if the device is not unlocked.

**Checked end to end in Stripe test mode, 2026-10-15:** Buy, Stripe's checkout ("Attention lifetime unlock, $6.99"), pay with the 4242 test card, back to the unlock page with a code, sizes unlocked, then the code typed in lowercase with spaces on a second browser unlocks it too. A malformed code gets the format hint. An unsigned webhook gets 400.

## Test results on the server (step 6)

**What is sent.** After each test, the score version, the length, which number test of that length this is on the device, and the scores: taps on a 3, missed numbers, early taps, average reaction time, its spread, CV and the attention score. No digits, no tap times, no date or time from the device, no device id. The server adds the day only (no time) and stores no IP address. Sending is tried once. If it fails (offline), the result still shows and stays on the device; it is simply not counted.

**What the server checks.** The version must be the current one. Every count must fit the test length (no more than 12 taps on a 3 in a Quick test). Times must fit the 1150 ms window. The score is worked out again from its parts and must match within 1 point. Anything off is refused with 400 and not stored.

**The comparison.** Built from first tests of each length only, from the current score version. Until 200 such results exist the answer is "not ready" and the result screen shows nothing. After that it returns how many first results had each score from 0 to 100, and the phone works out "higher than N% of first quick tests (1,234 people)", counting ties as half. The answer is cached for an hour at Cloudflare's edge and in the browser.

**Known gap.** Anyone could post made-up summaries that pass the checks and tilt the comparison. There is no account or device id to stop that, by design. If it happens, the fix is on the server (for example a daily cap, or dropping outliers), without changing the app.
