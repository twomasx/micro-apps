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

- [x] **The pass panel** under the protocol steps (`.protocol-pass`), done by Claude on Oct 16 at your request: a ruled panel with the specimen corner mark, an "All-app pass" label, the line in large type, and a light "See the PolymadLabs pass" button. No price, as with the rest of the page.
- [x] **"Pass" in the header nav**, after Index and Protocol, on the home, terms and refund pages. On phones the nav links are a little tighter (7px padding) and "Index of experiments" sits on its own line under the wordmark, so nothing wraps.
- [ ] With a pass on this browser, the app links open each app with a one-time token (`src/pass-links.ts`). Nothing visible changes.

## Terms and refunds (drafts)

- [ ] **Approve the wording** in `src/legal.ts`: the terms of use (`/terms`) and the refund policy (`/refunds`, 14 days, full refund, no reason needed). Three lines say "[Roger: ...]": the notice period if an app closes, the line about refunds after 14 days, and the law, business name and address.
- [ ] Once approved: remove "Draft ... Not yet approved." from both pages, drop the `noindex` tag, deploy the landing page and then the production router (it routes `/terms` and `/refunds`). Until then they are only on staging.
- [ ] Footer links "Terms of use" and "Refund policy" sit in their own list under the app links.
