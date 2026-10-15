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
