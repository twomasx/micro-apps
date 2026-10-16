# Design TODO: landing page

Design here is Claude's (see `CLAUDE.md`), so this is short: things only Roger can check or decide.

## Check on real devices

In this order: Android Chrome, iPhone Safari, tablet, desktop.

- [ ] The five specimens animate smoothly and match how each app looks on your phone.
- [ ] The headline does not wrap awkwardly on your phone ("You Are The / Experiment.").
- [ ] The Android Back button behaves normally after tapping Index or Protocol in the header.
- [ ] The link preview looks right when you paste polymadlabs.com into a message (after deploy).

## Open questions

- [ ] Personality's specimen shows ENFP as the example type. Any type works; say if you want a different one.
- [ ] Protocol step 1 still says "measure or train", while the subhead now says "measures, trains or tests". Fine as is, or add "or test" there too?

## The all-app pass

- [ ] **One line about the pass** under the protocol steps (`.protocol-pass`): "One pass unlocks every app, including the ones we add later." with a link to `/pass/`. No price, as with the rest of the page. Where should it sit and how should it look?
- [ ] With a pass on this browser, the app links open each app with a one-time token (`src/pass-links.ts`). Nothing visible changes.
