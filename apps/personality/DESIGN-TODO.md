# Design decisions for Roger

Everything here works today as plain, unstyled HTML. Each item is a decision that is yours. Class names and `data-*` attributes are listed so you can style without touching logic.

## Every screen

- All visual design: type, color, spacing, layout at 640px and 1024px.
- The footer trademark line (`.site-footer`). Where it sits and how quiet it is.
- Loading states are one line of text (`.test-loading`, `.result-loading`). Decide if they need more.
- PWA theme color, background color and icons are placeholders in `vite.config.ts`.

## Intro (`/`)

- Hooks: `main.intro[data-in-progress]`, `.intro-title`, `.intro-lead`, `.intro-free`, `.intro-instructions`, `.intro-actions`, `.intro-start`, `.intro-restart`, `.intro-progress`, `.intro-last-result`.
- The intro copy is a first draft. Change any of it.
- When a test is in progress the page shows "Continue the test" and "Start over". Decide if "Start over" should ask first. Today it does not.
- Whether the instructions line belongs here, on question 1, or both. Today it is on both.

## Test (`/test`)

- Hooks: `main.test[data-state="loading|ready|submitting"][data-index][data-answered]`, `.test-progress`, `.test-instructions`, `form.question[data-question-id]`, `.question-text`, `.scale-option[data-value][data-selected]`, `.scale-label`, `.question-actions`, `.question-back`, `.question-next`, `.test-error`.
- **Advance on answer.** Today you pick an answer, then press Next. The other option is to move on as soon as an answer is picked, with no Next button. That is faster on a phone but harder to get right for keyboard users. Your call.
- One question per screen. Changing this to several per page is a logic change, so say so early.
- Progress is text only ("Question 12 of 40"). A bar or dots can use `data-index` and `data-answered`.
- The scale is five labeled radio buttons in a column. Layout, and whether the labels stay visible on every option, is yours. Keep each option at least 44px tall.
- Motion between questions. There is none.
- Pressing Next with no answer shows the browser's own "select one of these options" message. Decide if you want a custom message.
- The submitting state: the button is only disabled. `data-state="submitting"` is there for a spinner or a message.

## Result (`/r/:id`)

- Hooks: `main.result[data-state][data-type][data-own]`, `.result-title-label`, `.result-type`, `.result-warning`, `.result-summary`, `ul.axes`, `li.axis[data-axis][data-letter][data-balanced]`, `.axis-headline`, `.axis-balance`, `.axis-plain`, `.axis-side[data-letter][data-winner][data-pct]`, `.result-share`, `.result-compare`, `.result-compare-warning`, `.result-message`, `.result-delete`, `.result-take-test`.
- How each axis is drawn. Today it is text: "68% Introversion", then both sides with whole numbers. A bar or scale needs the number as a CSS value; ask and I will add a `--pct` custom property to each side.
- How "balanced, leans N" is shown.
- Where the short type summary sits. It is empty until the content is written (build step 5).
- Share, compare and delete are three plain buttons. Order, weight and placement are yours.
- Delete asks with the browser's own confirm box. Decide if you want a designed dialog.
- After sharing, a line of text says "Link copied." (`.result-message`). Decide if that should be a toast.
- A result opened by someone else says "This type is INTJ" and offers "Take the test yourself". Check that wording.
