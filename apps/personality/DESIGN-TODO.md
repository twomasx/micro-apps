# Design decisions for Roger

The app now has a first full design, direction "Instrument": off-white paper, near-black ink, hairline rules, one accent color, Inter Tight with tabular numbers. Roger approved the direction on Oct 12, 2026. The details below were chosen by Claude and are yours to change.

## Where the design lives

- `src/base.css`: the tokens (`--paper`, `--ink`, `--ink-muted`, `--line`, `--accent`, `--radius`, `--font`), the reset, buttons, the footer.
- `src/styles/intro.css`, `test.css`, `result.css`: one file per screen.
- The typeface is self-hosted from the `@fontsource-variable/inter-tight` package (45 KB for Latin). No request goes to an outside font service.

## Choices to confirm or change

- **Accent color:** `#1f3bff` (cobalt blue). One line in `src/base.css`. It is used only for measured things: the progress lines, the result scales, focus rings, underlines.
- **Paper and ink:** `#f5f4f0` and `#0d0d0c`.
- **Light only.** There is no dark version yet. Say if you want one.
- **Corner radius:** 6px on buttons.
- **Typeface:** Inter Tight. The paid report is planned in a serif (Editorial direction); that face is not chosen yet.
- **Intro copy and the three readouts** ("40 questions", "~6 minutes", "$0 for the result") are drafts.
- **PWA theme color, background color and icons** are still placeholders in `vite.config.ts`.

## How the test behaves now

- A tap on an answer saves it, shows it selected for 160 ms, then the next question slides in. Number keys 1 to 5 do the same.
- Arrow keys and Space only select. Enter or the Next button moves on. This keeps the test usable by keyboard and screen reader.
- The last question never submits by itself. You press "See your result".
- A light vibration on each tap (Android only; iPhone Safari has no vibration).
- Four lines at the top, one per scale, fill as that scale's ten questions are answered. They show how much is answered, never which way you lean.
- On a phone the five answers sit at the bottom of the screen. From 640px up the block is centered.

## How the result behaves now

- The four letters come in one after another, 150 ms apart.
- Each percentage counts from 50 to its value and its marker slides from the middle of the scale. The whole reveal takes 1.35 s.
- Share, compare and delete fade in after the numbers settle.
- With "reduce motion" switched on in the phone settings, everything shows at once.
- From 1024px up the type code holds the left column and the scales run down the right.

## Still open

- "Start over" on the intro does not ask first.
- Delete uses the browser's own confirm box. Decide if you want a designed dialog.
- After sharing, a line of text says "Link copied." Decide if that should be a toast.
- Pressing Next with no answer shows the browser's own "select one of these options" message.
- Loading states are one line of text.
- A share image for results (planned for later in the spec).
- A result opened by someone else says "This type is INTJ" and offers "Take the test yourself". Check that wording.
- Not yet checked on a real Android phone or in iPhone Safari. Checked in headless Chromium at 375px, 768px and 1280px.

## Class names and state attributes

- Intro: `main.intro[data-in-progress]`, `.intro-kicker`, `.intro-title`, `.intro-lead`, `.intro-specs`, `.intro-spec`, `.intro-free`, `.intro-instructions`, `.intro-actions`, `.intro-start`, `.intro-restart`, `.intro-progress`, `.intro-last-result`.
- Test: `main.test[data-state="loading|ready|submitting"][data-index][data-answered]`, `.test-header`, `.test-progress`, `.test-axes`, `.test-axis[data-axis][data-complete]` with `--fill` (0 to 1), `.test-instructions`, `form.question[data-question-id][data-direction="forward|back"]`, `.question-fieldset`, `.question-text`, `.scale`, `.scale-option[data-value][data-selected]`, `.scale-key`, `.scale-label`, `.question-actions`, `.question-back`, `.question-next[data-last]`, `.test-error`.
- Result: `main.result[data-state][data-type][data-own][data-revealed]`, `.result-title-label`, `.result-type`, `.result-letter` with `--i`, `.result-warning`, `.result-summary`, `ul.axes`, `li.axis[data-axis][data-letter][data-balanced][data-winner="left|right"]` with `--pct` and `--step`, `.axis-headline`, `.axis-pct`, `.axis-name`, `.axis-balance`, `.axis-plain`, `.axis-scale`, `.axis-fill`, `.axis-marker`, `.axis-side[data-letter][data-winner][data-pct]`, `.result-share`, `.result-compare`, `.result-compare-warning`, `.result-message`, `.result-delete`, `.result-take-test`.
