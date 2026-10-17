# Pass: design notes for Roger

Designed by Claude on Oct 16, 2026, at Roger's request ("I'd like everything to be fleshed out"). The pass belongs to the
whole suite, so it uses the landing page's Lab Index look: cool-gray ground, near-black ink, thin rules, one burnt-orange
accent, IBM Plex Sans and Mono, the PolymadLabs wordmark header and the colophon footer. All styles are in `src/styles.css`.
Change anything you like.

## What was decided, so you can overrule it

- **Offer page:** headline and lead on the left; on the right (below on phones) a ruled sheet listing what the pass unlocks
  in each app, numbered 01 to 05 like the landing index, plus "Apps we add later: Included", then the price and the buy bar.
- **Buy button:** solid ink bar in mono capitals with an arrow, accent orange on press. Closed (kill switch): dashed outline,
  "Unlocks open soon".
- **Code card:** a sheet with the accent corner, the code in mono, and a full-width "Copy the code" outline button that turns
  orange with a tick when copied.
- **App buttons:** one ruled row per app (number, "Open Focus", a square arrow), like the landing index. Three columns on
  desktop. They stay plain, without each app's own colors, so the page reads as one suite.
- **Thanks page:** "Your pass is ready" with the code card beside it, then the app rows. While checking, a small orange
  square pulses (it stays still when reduced motion is on).
- **Restore page:** the code field sits in the same sheet as the offer, with the help lines under it.
- **TEST MODE label:** a small orange tab at the top edge, staging only.

## Words to confirm

- [ ] Title "Every PolymadLabs app", button "Buy the pass", "Open <app>", "Apps we add later: Included".
- [ ] Contact address `help@polymadlabs.com` (in `packages/payments/src/contact.ts`). The mailbox must exist before go-live.
- [ ] The footer links to `/terms` and `/refunds`. Those pages are drafts, served on staging only until you approve them.
