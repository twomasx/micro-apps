# Design decisions for Roger

The app now has a first full design, direction "Instrument": off-white paper, near-black ink, hairline rules, one accent color, Inter Tight with tabular numbers. Roger approved the direction on Oct 12, 2026. The details below were chosen by Claude and are yours to change.

## Where the design lives

- `src/base.css`: the tokens (`--paper`, `--ink`, `--ink-muted`, `--line`, `--accent`, `--radius`, `--font`), the reset, buttons, the footer.
- `src/styles/intro.css`, `test.css`, `result.css`, `report.css`, `compare.css`, `info.css`: one file per screen.
- The typeface is self-hosted from the `@fontsource-variable/inter-tight` package (45 KB for Latin). No request goes to an outside font service.

## Choices to confirm or change

- **Accent color:** `#1f3bff` (cobalt blue). One line in `src/base.css`. It is used only for measured things: the progress lines, the result scales, focus rings, underlines.
- **Paper and ink:** `#f5f4f0` and `#0d0d0c`.
- **Light only.** There is no dark version yet. Say if you want one.
- **Corner radius:** 6px on buttons.
- **Typeface:** Inter Tight. The paid report is planned in a serif (Editorial direction); that face is not chosen yet.
- **Intro copy and the three readouts** ("40 questions", "~6 minutes", "$0 for the result") are drafts.
- **PWA theme color and background color** are still placeholders (`#ffffff`) in `vite.config.ts`. The icons are done.

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

## How the full report behaves now

- The result page has a "Full report" block under Share: one line on what is in it, a hairline button "See the full report", and the price line. Once paid the button says "Read the full report" and the price is gone.
- `/r/:id/report` shows the offer when the report is locked: the type code, three lines on what is inside, a solid ink button "Unlock the full report", then "$9.99 once. No renewals." and a note that you pay on Stripe and that anyone with the link can read an unlocked report.
- The button goes straight to Stripe Checkout. There is no confirm step in between.
- Coming back from Stripe opens the report. If the payment is not confirmed yet, the offer shows a note and a "Check again" button.
- The report is laid out like a printed readout. All of these are Claude's choices for you to confirm or change:
  - **Cover:** the type code, a four-cell readout (letter, percentage, name), the summary, and a line with the date taken, the question count and the result ID.
  - **Contents:** five numbered parts. On a phone it is a list under the cover. From 1024px up it stays fixed beside the report.
  - **01 Profile:** all four scales on one panel with a line joining the four markers. The shaded band is the balanced zone, 45% to 55%.
  - **02 The four scales:** each scale is drawn as a ruler with 41 ticks, one for every position a 10-question scale can land on. The marker and the fill from the middle use the accent.
  - **03 The Big Five traits:** four bars from low to high with a tick at the middle, and a note that the numbers do not compare you with other people.
  - **04 In depth:** the five type sections, numbered, in two columns from 640px up.
  - **05 How this was measured:** three numbers (40 questions, 10 per scale, 2.5 points per answer) and one paragraph.
  - **Print or save as PDF** button at the end. The print layout hides the contents list and the buttons.
- The accent is still used only for measured things: markers, fills, the profile line, the bars, and the small numbers and letters that label them.
- Nothing in the report animates.

## How comparing behaves now

- "Send a compare link" on your result shares `/personality/?with=<your result>`.
- The person who opens it sees a note on the intro, "Someone wants to compare". When they finish the test they land on the comparison, not on the plain result. If they already have a result on that phone, the note also offers "Compare using your last result".
- The sender does not see anything by itself. The receiver has to press "Send this comparison" to share it back. Check that this is the flow you want.
- `/c/:a/:b` shows: both type codes, a legend (filled dot and ring), one number labeled "How similar your answers are" with a note that it is not a prediction, then the four scales with both markers and a line for the gap. Each scale is tagged "Alike" or "Different".
- Your own result is always shown first and labeled "You", the other "Them". If neither result is from this phone they are "First" and "Second".
- Under the scales: the couple report offer ("$7.99 once. No renewals."). If one result is yours and its full report is not unlocked, a second button sells both for $14.99.
- Once paid, the couple report shows one block per scale: which case applies ("Both N", "One E, one I"), the text, and four questions. From 640px up the questions sit beside the text.
- From 1024px up the numbers are on the left and the four scales on the right.

## The science and privacy pages

- `/science` and `/privacy` are plain reading pages built from `content/science.md` and `content/privacy.md`. Both are linked from the footer of every page.

## Still open

- "Start over" on the intro does not ask first.
- Delete uses the browser's own confirm box. Decide if you want a designed dialog.
- After sharing, a line of text says "Link copied." Decide if that should be a toast.
- Pressing Next with no answer shows the browser's own "select one of these options" message.
- Loading states are one line of text.
- **Report typeface.** The report uses Inter Tight for now. Pick the serif for long reading.
- **Where the report offer sits on the result page**, and how loud it should be. It is a quiet block under Share now.
- **Offer wording**: the lead, the three "what is inside" lines and the button labels are drafts.
- **Product names on the Stripe page** ("Full personality report") are in `config/products.json`.
- **Stripe Checkout look**: it shows your Stripe account name and default colors. Branding is set in the Stripe dashboard.
- The report has no share button of its own.
- **Chart details** to check on your phone: marker size (12px), ruler height (40px), bar thickness (8px), the shade of the balanced band (`--tint` in `src/base.css`).
- **Wording in the report frame**: part titles, the profile caption, the Big Five note and the "How this was measured" paragraph are drafts. They are in `ReportPage.tsx` and `src/lib/report-view.ts`, not in `content/`, because they are the same for every type.
- **Words on the compare page**: "You" and "Them", "First" and "Second", "Alike" and "Different", the offer text, and the note under the similarity number are drafts.
- **The similarity number is big.** The spec allows it, but decide how much weight it should get next to the four scales.
- **Compare notice on the intro** is a white box with an accent edge. Same treatment as the messages on the result page.
- **Footer links** ("The science", "Privacy") sit above the trademark line on every page, including during the test.
- **Icon.** Roger's four-slider design from the favicons kit, recolored on Oct 15, 2026 to the app's own tokens: paper `#f5f4f0` background, slider tracks in ink `#0d0d0c` at 32% (`--line-strong`), markers in the accent `#1f3bff`. Full-bleed square, no rounded corners. `public/favicon.svg` is the source; the PNGs (180, 192, 512) are rendered from it. Check the tracks are not too faint on your home screen.
- A share image for results (planned for later in the spec).
- A result opened by someone else says "This type is INTJ" and offers "Take the test yourself". Check that wording.
- **Router pages.** `polymadlabs.com/`, the four "Coming soon" pages and the 404 page are plain unstyled HTML in `router/src/pages.ts`. They are yours to design.
- Not yet checked on a real Android phone or in iPhone Safari. Checked in headless Chromium at 375px, 768px and 1280px.

## Class names and state attributes

- Intro: `main.intro[data-in-progress]`, `.intro-kicker`, `.intro-title`, `.intro-lead`, `.intro-specs`, `.intro-spec`, `.intro-free`, `.intro-instructions`, `.intro-actions`, `.intro-start`, `.intro-restart`, `.intro-progress`, `.intro-last-result`.
- Test: `main.test[data-state="loading|ready|submitting"][data-index][data-answered]`, `.test-header`, `.test-progress`, `.test-axes`, `.test-axis[data-axis][data-complete]` with `--fill` (0 to 1), `.test-instructions`, `form.question[data-question-id][data-direction="forward|back"]`, `.question-fieldset`, `.question-text`, `.scale`, `.scale-option[data-value][data-selected]`, `.scale-key`, `.scale-label`, `.question-actions`, `.question-back`, `.question-next[data-last]`, `.test-error`.
- Report: `main.report[data-state="loading|locked|ready|notFound|error"][data-type]`, `.report-title`, `.report-kicker`, `.report-type`, `.report-lead`, `.report-contents`, `.report-unconfirmed`, `.report-check`, `.report-buy`, `.report-unlock`, `.report-price`, `.report-note`, `.report-error`, `.report-cover`, `.report-cover-side`, `.report-readout`, `.report-readout-cell[data-axis]`, `.report-meta`, `.report-summary`, `.report-layout`, `.report-contents-nav`, `.report-toc`, `.report-body`, `section.report-part#profile|scales|traits|depth|method`, `.report-part-title`, `.report-part-number`, `article.report-axis[data-axis][data-balanced]`, `.report-axis-headline`, `.report-axis-name`, `.report-axis-balance`, `.report-axis-blocks`, `.report-block`, `.report-block-title`, `.report-depth-grid`, `.report-facts`, `.report-actions`, `.report-print`, `.report-back-link`. Charts: `.profile-chart` with `--rows`, `.profile-row[data-axis][data-winner]` with `--pos` and `--row`, `.profile-side[data-winner]`, `.profile-marker`, `svg.profile-overlay` (`.profile-band`, `.profile-middle`, `.profile-line`); `.ruler[data-winner]` with `--pos` and `--band`, `.ruler-tick[data-size="minor|major|center"]` with `--t`, `.ruler-band`, `.ruler-fill`, `.ruler-marker`, `.ruler-side[data-winner]`; `.traits`, `li.trait[data-axis]` with `--pct`, `.trait-bar`, `.trait-fill`. On the result page: `.result-report[data-unlocked]`, `.result-report-title`, `.result-report-lead`, `.result-report-link`, `.result-report-price`.
- Compare: `main.compare[data-state][data-own][data-unlocked]`, `.compare-title`, `.compare-kicker`, `.compare-types`, `.compare-type`, `.compare-and`, `.compare-legend`, `.compare-legend-item[data-side="a|b"]`, `.compare-similarity`, `.compare-similarity-value`, `.compare-similarity-label`, `.compare-similarity-note`, `ul.compare-axes`, `li.compare-axis[data-axis][data-alike]`, `.compare-axis-title`, `.compare-axis-tag`, `.pair-scale` with `--a`, `--b`, `--from` and `--gap`, `.pair-marker[data-side]`, `.pair-gap`, `.compare-axis-ends`, `.compare-axis-side[data-side]`, `.compare-offer`, `.compare-buy[data-product]`, `.compare-unlock`, `.compare-unlock-both`, `.compare-price`, `.compare-note`, `.compare-unconfirmed`, `.compare-couple`, `article.compare-couple-section[data-axis]`, `.compare-couple-tag`, `.compare-couple-questions`, `.compare-share`.
- Intro compare notice: `.intro-compare`, `.intro-compare-title`, `.intro-compare-text`, `.intro-compare-link`, `.intro-compare-own`.
- Info pages: `main.info[data-page="science|privacy"]`, `.info-title`, `.info-section`, `.info-section-title`, `.prose-list`, `.info-back-link`. Footer: `.site-footer-nav`, `.site-footer-link`.
- Result: `main.result[data-state][data-type][data-own][data-revealed]`, `.result-title-label`, `.result-type`, `.result-letter` with `--i`, `.result-warning`, `.result-summary`, `ul.axes`, `li.axis[data-axis][data-letter][data-balanced][data-winner="left|right"]` with `--pct` and `--step`, `.axis-headline`, `.axis-pct`, `.axis-name`, `.axis-balance`, `.axis-plain`, `.axis-scale`, `.axis-fill`, `.axis-marker`, `.axis-side[data-letter][data-winner][data-pct]`, `.result-share`, `.result-compare`, `.result-compare-warning`, `.result-message`, `.result-delete`, `.result-take-test`.

## Payments across the apps (PAYMENTS.md)

- [ ] **"Unlocks open soon":** while payments are closed (the kill switch), the buy button is disabled, says "Unlocks open soon" and has `data-state="closed"` (open is `data-state="open"`). Style the closed state.
- [ ] **TEST MODE label:** staging only (`.test-mode-label`, `data-mode="test"`, in `src/components/TestModeLabel.tsx`, shown when the hostname starts with `staging.`). For now it is fixed to the top edge in the middle, in plain system colors, and taps go through it. Production never shows it.
- [ ] **Pass offer** (`.pass-offer` under the report and couple report buy buttons): "Or get every app for $19.99 once.", a link to the pass page, and "Have a PolymadLabs pass? Enter your pass code".
- [ ] **Pass page** (`/personality/pass?back=...`, `.pass-page`): enter a pass code, then go back to the report or comparison.
