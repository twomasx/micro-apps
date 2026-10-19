# Payments across the suite: build, test, go live

Goal: every way a purchase can succeed or fail is tested in Stripe test mode on a full staging copy of the site before any live key exists. Going live is then a switch (new secrets, and `PAYMENTS_MODE` set to `live` in each `wrangler.jsonc`), not new code, and it can be switched back off in one step.

Read the root CLAUDE.md first. All payment code goes through `packages/payments`. Never call Stripe directly from an app.

## What is sold

| Product id | App | What it unlocks | Price |
| --- | --- | --- | --- |
| `report` | personality | Full report for one result | $9.99 |
| `couple` | personality | Couple report for one pair | $7.99 |
| `both` | personality | Both of the above | $14.99 |
| `lifetime` | focus | Lifetime unlock | $6.99 |
| `lifetime` | breathwork | Lifetime unlock | $4.99 |
| `lifetime` | attention | Lifetime unlock | $6.99 |
| `labpass` | intention | Lab Pass | $4.99 |
| `pass` | all apps | Everything in every app, now and in future apps | $19.99 |

- Prices live only in each app's `config/products.json` (and `config/products.json` for the pass). A test fails if a price shown in the app differs from the Stripe price for the same product.
- All prices are one-time. Copy always says "once. No renewals."

## 1. Two environments: staging (test mode) and production (live mode)

**Where things stand today:** production runs with Stripe **test** keys, and its test webhooks point at production addresses. Anyone can "buy" there with a test card and get a real unlock. Fix that first (step 1 of the build order).

**Staging is the same code deployed a second time with its own settings.** It is not a separate codebase.

- Each app's Pages project already makes preview deployments. Deploy the `staging` branch of every app (and the pass service) as its preview, so each has a stable address like `staging.<project>.pages.dev`.
- Cloudflare Pages keeps separate **environment variables, secrets and bindings** for Preview and Production. Use that:
  - **Preview (staging):** Stripe **test** keys, test webhook secrets, `PAYMENTS_MODE=test`, and its **own D1 databases** (bind separate staging databases). Permanently.
  - **Production:** live keys after go-live, `PAYMENTS_MODE=live`. Never both modes in one environment.
- **Every address that differs between environments is config, never hard-coded:** `PUBLIC_ORIGIN` (the app's own address) and `PASS_API_ORIGIN` (the pass service). Staging apps call the staging pass service. Production apps call production's.
- **staging.polymadlabs.com:** add this hostname to the router's preview Worker, routing every app path (and `/pass/`) to that app's staging deployment, the same way production routes to production. This needs one DNS record, set up by wrangler or by Roger in the Cloudflare dashboard. Roger tests on his phone there with real test-mode checkouts.
- Staging shows a small fixed "TEST MODE" label. Production never shows it.
- **Stripe webhooks per environment:** test-mode webhook endpoints point at **staging** addresses. Production gets live-mode endpoints at go-live. Move today's test endpoints from production to staging as part of step 1.
- **Every purchase and pass row records its mode** (`test` or `live`). An app only accepts purchases whose mode matches its own `PAYMENTS_MODE`. So a test purchase can never unlock anything in live production, even if a test row is left behind. At go-live, delete production's test rows as well (keep an export first).
- When an app moves to its own domain later, it gets its own staging address the same way (for example `staging.<its-domain>`), and its origin is added to the pass service's CORS list for that environment.

## 2. The kill switch

- `PAYMENTS_ENABLED` per app (and for the pass), an environment variable read by both the functions and the client.
- When `false`: buy buttons show "Unlocks open soon" and checkout endpoints return 503. Existing unlocks keep working.
- Flipping it is one command per app (`wrangler pages secret put PAYMENTS_ENABLED ...` plus a redeploy, or a config value if faster). DEPLOY.md lists the exact commands.

## 3. The all-app pass

**Design rule: nothing depends on the apps sharing a domain.** Any app may move to its own domain later, or become a phone app. Browsers do not let different domains read each other's storage, and third-party cookies are being blocked. So the pass is a service that apps ask, never something they find in shared storage.

- **The pass service lives at polymadlabs.com permanently** (the brand home, it never moves): a new small Pages project `pass`, served at `/pass/` through the router. It has the pass page, checkout, success screen, restore, the webhook, and a public verify API.
- **Verify API:** `POST https://polymadlabs.com/pass/api/verify` with a pass code returns `{ valid, status }` (`active`, `refunded`, `disputed`, `unknown`, `device_limit`). CORS allows each app's origin from a list in config, so apps on other domains can call it. Rate limited per IP.
- **Apps never read the pass database directly.** Only the pass service touches its D1 database. Every app calls the verify API through one function in `packages/payments`: `checkPass(code)`. This keeps working wherever an app is hosted, including inside a future phone app.
- **Each app keeps its own copy** of the pass code in its own storage (key `<app>:pass`). It trusts the last answer for up to 24 hours, then checks again, so refunds and disputes take effect within a day. If the service can't be reached, it trusts the last good answer for up to 7 days.
- **Carrying the pass across domains with no typing:** links from the pass success screen, the pass page and the landing page add a one-time token (`?passToken=...`, valid for 10 minutes, single use). The app exchanges the token with the pass service for the code and stores it, then removes the token from the address bar. Typing the code on any app's restore screen always works as a backup.
- After purchase the success screen shows the pass code: "Save this code to unlock every PolymadLabs app on any device," and buttons that open each app with a token.
- **Every app's unlock check:** its own purchase **or** `checkPass` says active. Every app's restore screen accepts pass codes.
- **Personality with a pass:** every full report and couple report is unlocked. Personality's server calls the verify API before returning paid text.
- Every app's unlock screen offers the pass: "Or get every app for $19.99 once." The landing page gets one line about it.
- **Terms:** "The pass covers every app operated by PolymadLabs, including new ones." If an app is ever sold or spun off, its own single-app purchases move with it; pass holders keep access for as long as PolymadLabs runs the app.
- **Per-app independence stays intact:** each app keeps its own Stripe products, webhook endpoint, secrets and purchases table, so any app can move to its own domain (or its own Stripe account) without touching the others. The origin each app runs on is config (`PUBLIC_ORIGIN`), never hard-coded.
- Upgrade credit (pay the difference if you already bought one app) is **not** in this version. Note it in Later.

## 3b. Security for unlock and pass codes

Codes work like keys: anyone holding one gets in. These rules keep that safe enough for one-time purchases without accounts.

1. **Code format and strength.** App unlock codes: at least 12 random characters. Pass codes: 16 random characters from an unambiguous alphabet (no 0/O, 1/I/L), shown in groups: `K7QM-2XRP-9VTD-4HNC`. Input accepts any case, with or without dashes.
2. **Stored only as hashes.** The server stores a hash of each code, never the code itself. Checking a code means looking up its hash and confirming the row exists, matches the current mode and is `active`. A code that merely looks right is never enough, even if it was derived from a secret.
3. **Device cap.** A code works on up to **5 devices per app** (a pass code: 5 in each app). Each app sends its anonymous device ID with every check. The service records distinct device IDs per code. A 6th device gets: "This code is already in use on 5 devices. Contact us if that's wrong." Roger can reset a code's devices with the admin script.
4. **Sharing alerts.** The reconcile script lists any code that hit the device cap or was checked from many IP addresses in a day.
5. **Revoke and reissue.** `scripts/reissue-code.ts`: revokes a leaked code and creates a new one for the same purchase, printed for Roger to send the buyer. Revoked codes stop working on the next check.
6. **Rate limits.** Verify and restore: 10 attempts a minute per IP and 100 a day per IP. Wrong codes count toward the limit. Use a Cloudflare rate-limiting rule if available on the plan, otherwise a counter in D1.
7. **Strict page security.** Every app and the pass service send a Content Security Policy that allows scripts only from the app itself (no outside scripts at all, which also rules out analytics), plus `Referrer-Policy: no-referrer`. This stops other code from reading stored codes, and stops one-time tokens from leaking through links.
8. **One-time tokens:** single use, expire after 10 minutes, removed from the address bar right after use.
9. **What can't be protected, honestly:** in apps where paid features run on the phone, a technical user could edit the page code to unlock them. That's true of every browser app and is accepted at these prices. Anything that can be checked on the server is checked on the server (personality's paid text, Intention's run limits and history, the pass).

## 4. Payment rules every app follows

- Checkout: Stripe-hosted Checkout, cards plus Apple Pay and Google Pay. **Turn off delayed payment methods** (bank debits and the like), so a purchase is either paid or not when checkout ends.
- The unlock is decided by the server only, from a verified webhook, or from `verifyPurchase(sessionId)` asking Stripe directly when the user returns before the webhook arrives.
- Webhooks:
  - Verify the signature. Reject anything unsigned or signed with the wrong secret.
  - Store every Stripe event ID in a `stripe_events` table. Seeing the same event twice does nothing the second time.
  - Events in the wrong order must still end in the right state.
  - Handle: `checkout.session.completed` (unlock), `charge.refunded` (revoke), `charge.dispute.created` (revoke and mark disputed), `charge.dispute.closed` (a won dispute, or an inquiry closed with no chargeback, unlocks again unless the payment was also refunded).
- Refunds and disputes revoke the unlock or pass on the next check, on every device.
- Statement descriptor: `POLYMADLABS`, so buyers recognise the charge.
- Receipts: Stripe's emailed receipts are turned on (dashboard setting, Roger does this).
- Lost codes, version 1: the privacy and unlock pages give a contact email. A small admin script (`scripts/find-purchase.ts`, run by Roger in WSL) finds a purchase by the buyer's email through the Stripe API and prints its unlock code. No self-serve email lookup, because anyone could type someone else's email.
- Logging: every checkout start, webhook, verify, unlock, refund and failure is written to a `payment_log` table with the app, product, session ID and result. No card data ever touches our servers.

## 5. Tests

**Automated (Vitest), in `packages/payments` and each app:**

- Price in each app matches its Stripe price (staging only, using the test API).
- Webhook: valid signature unlocks; bad signature returns 400 and changes nothing; the same event twice unlocks once; refund after completion revokes; refund arriving before completion ends revoked.
- `verifyPurchase` unlocks when the webhook is late, and refuses unpaid or expired sessions.
- Unlock check: own purchase, pass, refunded pass, disputed purchase, unknown code, malformed code.
- Kill switch off: checkout returns 503, existing unlocks still work.
- Pass: a pass code unlocks each app's paid features, including personality reports.
- Pass from another origin: run one app's build on a different origin (for example its `*.pages.dev` address) and confirm it unlocks through the verify API and the one-time token, with no shared storage.
- Token: works once, expires after 10 minutes, is removed from the address bar after use.
- Mode: a `test` purchase is refused by an app running with `PAYMENTS_MODE=live`, and the reverse.
- Device cap: a 6th device is refused, a reset lets it in.
- Reissue: the old code stops working, the new one works.
- Rate limit: the 11th wrong code in a minute is refused.
- Codes are stored only as hashes (check the database rows directly in a test).
- Pass service down: the app keeps the last good answer for up to 7 days, then asks for the code again.

**Reconciliation script:** `scripts/reconcile.ts` lists every paid Checkout session in Stripe for a date range and compares it with every `purchases` and `passes` row. It prints anything missing on either side. Run it after the test session and daily for the first week of live sales.

**Roger's phone checklist on staging.polymadlabs.com** (Claude Code prints this as `PAYMENTS-CHECKLIST.md` and fills in the last column when he reports back):

| # | Test | Card or action | Expected |
| --- | --- | --- | --- |
| 1 | Buy each app's product | 4242 4242 4242 4242 | Unlocks immediately, code shown |
| 2 | Buy the pass | 4242 4242 4242 4242 | Code shown; each app opened from the success screen is unlocked without typing |
| 3 | Bank asks for confirmation | 4000 0025 0000 3155 | Confirmation step, then unlocks |
| 4 | Card declined | 4000 0000 0000 0002 | Clear error, nothing unlocked, can retry |
| 5 | Not enough funds | 4000 0000 0000 9995 | Clear error, nothing unlocked |
| 6 | Close the tab right after paying | 4242, then close | Reopen the app: unlocked (webhook) |
| 7 | Restore on another browser | Paste the code | Unlocked |
| 8 | Restore with a pass code in each app | Paste the pass code | Unlocked |
| 8b | Pass on a different domain | Open an app at its pages.dev address from the pass success screen | Unlocked with no typing |
| 9 | Refund from the Stripe dashboard | Refund test 1 | Unlock gone on next open |
| 10 | Dispute | 4000 0000 0000 0259 | Unlock gone, logged as disputed |
| 11 | Kill switch | Set PAYMENTS_ENABLED=false on one app | "Unlocks open soon", existing unlocks work |
| 12 | Back button during checkout | Start checkout, press Back | Returns to the app, nothing broken |
| 13 | Google Pay | Android Chrome checkout | Google Pay offered and works in test mode |
| 14 | Webhook replay | `stripe events resend <id>` | Nothing doubled |
| 15 | Reconcile | Run `scripts/reconcile.ts` | No mismatches |
| 16 | Device cap | Use one pass code on 6 browsers or devices | 6th refused with the contact message |
| 17 | Reissue | Run `scripts/reissue-code.ts` on a test pass | Old code stops working, new one works |
| 18 | Production is closed | Open polymadlabs.com (production) | Buy buttons say "Unlocks open soon" |

Confirm the test card numbers against Stripe's current testing docs before the session.

## 6. Go-live checklist (Roger and Claude Code together, in order)

1. **Stripe activation (Roger):** business details, bank account, statement descriptor `POLYMADLABS`, receipts on. The site needs a contact email, a refund policy and terms of service first. Claude Code adds `/terms` and `/refunds` pages to the landing app with plain wording (Roger approves the refund policy, for example "Refunds within 14 days, just email us").
2. **All of section 5 passes on staging,** with the checklist filled in and reconcile clean.
3. **Live keys are restricted keys (Roger creates them, Developers → API keys → Create restricted key), never the full secret key.** Two of them:
   - `polymadlabs-apps`, set as `STRIPE_SECRET_KEY` on the six production Pages projects: Checkout Sessions **Write**, Prices **Read**, everything else None. That is all the apps call (create and read a Checkout session, look up a price). Webhook signatures are checked with the signing secret, not the key.
   - `polymadlabs-admin`, kept only on Roger's machine for the scripts: Products **Write**, Prices **Write**, Webhook Endpoints **Write**, Checkout Sessions **Read**, everything else None.

   Refunds are made in the dashboard, so no key can move money out. Check both keys' permissions on staging first with the same two keys made in test mode.
4. **Create live products and prices** with a script from `products.json` (`scripts/stripe-sync.ts --live`), so live matches test exactly. The script refuses to run if any test or live price differs from config.
5. **Live webhooks:** one endpoint per app plus the pass, created by the same script, with signing secrets printed as `wrangler pages secret put` commands for Roger to run. Keys never go in chat.
6. **Set live secrets in Production only,** with `PAYMENTS_ENABLED=false` at first, and commit `PAYMENTS_MODE: "live"` in the production `vars` of every app's and the pass's `wrangler.jsonc`. Check that `ROUTER_KEY` is set on the production router and all six Pages projects (DEPLOY.md, Code security). Export, then delete, production's test-mode purchase and pass rows. Delete or disable any test-mode webhook that still points at production. Deploy every app.
7. **Turn on one app** (focus first), buy it with Roger's own card, confirm the unlock, refund it, confirm the revoke. Then turn on the rest one by one, the same way, and the pass last.
8. **First week:** run reconcile daily, check Stripe's webhook delivery page daily.
9. **If anything looks wrong:** kill switch off for that app, fix on staging, test, switch back on.

## Build order

1. **Close production first:** add the kill switch from section 2 to every app and set `PAYMENTS_ENABLED=false` in production, so nobody can unlock with a test card on the public site. Add the `mode` column to every purchases table (existing rows are `test`) and the mode check to every unlock. Deploy, and confirm on polymadlabs.com that buy buttons say "Unlocks open soon".
2. Staging: the `staging` branch deployed as each app's preview, separate staging D1 databases and secrets, `PUBLIC_ORIGIN` and `PASS_API_ORIGIN` per environment, staging.polymadlabs.com through the router's preview Worker, the TEST MODE label, and test webhooks moved from production to staging. **Stop: Roger opens staging on his phone.**
3. `packages/payments` hardening: events table, refunds, disputes, verify, logging, with tests. Update every app to use it. All existing tests must still pass.
4. The pass service, its database and verify API, `checkPass` in every app, the one-time token flow, the pass offer on unlock screens.
5. Security from section 3b (code format, hashing, device cap, rate limits, page security). Scripts: stripe-sync, reconcile, find-purchase, reissue-code.
6. `/terms` and `/refunds` drafts for Roger to approve.
7. Print `PAYMENTS-CHECKLIST.md`. **Stop: Roger runs the phone checklist on staging.**
8. Go live only when Roger says so, following section 6.

Commit after each step.

## Later

- Upgrade credit: pay the difference from a single-app purchase to the pass.
- Simple accounts with an emailed sign-in link (no password), once there is an email service. This is the real fix for shared and lost codes, and fits the future phone apps.
- Sales and payments in the admin dashboard.
