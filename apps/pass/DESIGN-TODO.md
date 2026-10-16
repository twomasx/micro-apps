# Pass: design decisions for Roger

The pass pages are plain HTML with a tiny reset. Everything visual is yours.

## Pages

- [ ] **The pass page (`/pass/`):** the offer (`.pass`, `data-state="offer"`) and the "Your pass is on this device" view (`data-state="has-pass"`). The list of what each app unlocks comes from `config/apps.json`.
- [ ] **Buy button:** `button.pass-buy`, `data-state="open"` or `"closed"` (the kill switch: "Unlocks open soon").
- [ ] **The code card** (`.code-card`): the code in groups of four, "Save this code to unlock every PolymadLabs app on any device.", and a copy button (`data-state="copied"`).
- [ ] **App buttons** (`.app-links`, one `button.app-link-button` per app, `data-state="opening"` while it makes the token). On staging the list also has each app "on another address (test)". Should the buttons carry each app's own look (icon, color), or stay plain?
- [ ] **Thanks page** (`/pass/thanks`, `data-state` checking, paid, pending, offline, notFound).
- [ ] **Restore page** (`/pass/restore`).
- [ ] **Terms** (`.pass-terms`): the two lines about what the pass covers.
- [ ] **TEST MODE label** on staging, as in the apps.

## Words to confirm

- [ ] Title "Every PolymadLabs app", button "Buy the pass", "Open <app>".
- [ ] Contact address `help@polymadlabs.com` (in `packages/payments/src/contact.ts`). The mailbox must exist before go-live.
