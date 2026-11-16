# Design TODO: landing page

Design here is Claude's (see `CLAUDE.md`), so this is short: things only Roger can check or decide.

## Check on real devices

In this order: Android Chrome, iPhone Safari, tablet, desktop.

- [ ] The five specimens animate smoothly and match how each app looks on your phone.
- [ ] The headline does not wrap awkwardly on your phone ("You Are The / Experiment.").
- [ ] The Android Back button behaves normally after tapping Index or Protocol in the header.
- [ ] The link preview looks right when you paste polymadlabs.com into a message (after deploy).

## Design

- [x] **Observatory picked** by Roger on Nov 15, 2026. The switcher, Spectrum, Field Journal and their fonts are gone, so the footer line "stores nothing on your device" is true again.
- [x] The link preview image (`public/og.png`), the favicon and the home screen icon are redrawn in Observatory.
- [ ] Check the new home screen icon and the link preview on your phone (after deploy).

## Open questions

- [ ] Personality's specimen shows ENFP as the example type. Any type works; say if you want a different one.
- [ ] Protocol step 1 still says "measure or train", while the subhead now says "measures, trains or tests". Fine as is, or add "or test" there too?

## The all-app pass

- [x] **The pass panel** under the protocol steps (`.protocol-pass`), done by Claude on Oct 16 at your request: a ruled panel with the specimen corner mark, an "All-app pass" label, the line in large type, and a light "See the PolymadLabs pass" button. No price, as with the rest of the page.
- [x] **"Pass" in the header nav**, after Index and Protocol, on the home, terms and refund pages. On phones the nav links are a little tighter (7px padding) and "Index of experiments" sits on its own line under the wordmark, so nothing wraps.
- [ ] With a pass on this browser, the app links open each app with a one-time token (`src/pass-links.ts`). Nothing visible changes.

## Terms and refunds

- [x] **Wording approved** on Oct 19, 2026 (`src/legal.ts`): sold by Roger L. Tafoya III in Hillsboro, Oregon, Oregon law, 14-day refunds, 30 days' notice and refunds if an app closes.
- [x] **Live and in search** since Nov 15, 2026: the `noindex` tag left over from the drafts is gone, each page has its own canonical address, and both are in the landing sitemap.
- [ ] Footer links "Terms of use" and "Refund policy" sit in their own list under the app links.
