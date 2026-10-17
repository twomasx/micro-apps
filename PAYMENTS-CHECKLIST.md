# Payments phone checklist (staging)

Run this on your Android phone first, then iPhone Safari, at **https://staging.polymadlabs.com**. Every page there shows a small TEST MODE label. Nothing here charges a real card. Fill in the last column (pass, fail, or what you saw), and I'll update this file with your results.

Test cards were checked against Stripe's testing docs (docs.stripe.com/testing) on Oct 16, 2026. For every card: any future expiry date, any 3-digit CVC, any name and postcode. On Stripe's page, untick "Save my information" (Link), or it asks for a phone number.

**Before you start**

- Google Pay was off in Stripe's test-mode settings. I turned it on (test mode only). Google Pay only shows if your phone's Google Wallet has a real card in it. In test mode Stripe swaps it for a test card and nothing is charged.
- Apple Pay is on in test mode. It shows on iPhone Safari with a card in Apple Wallet. Same rule: nothing is charged.
- If staging fails to open on the Windows PC only, run `ipconfig /flushdns` in a Windows terminal. The phone is not affected.
- Buy with any email you can read. Stripe's test mode sends no real receipts.

| # | Test | Card or action | Expected | Your result |
| --- | --- | --- | --- | --- |
| 1 | Buy each app's product | 4242 4242 4242 4242 on `/focus/unlock`, `/breathwork/unlock`, `/attention/unlock`, `/intention/unlock`, and a personality full report | Unlocks right away. The four code apps show a code in groups of four. Personality has no code: the report opens, and the result link is what restores it | |
| 2 | Buy the pass | 4242 4242 4242 4242 on `/pass/` | Code shown. Each "Open ..." button on the thanks page opens that app already unlocked, with nothing typed | |
| 3 | Bank asks for confirmation | 4000 0025 0000 3155 | Stripe shows a confirmation step. Complete it, then it unlocks | |
| 4 | Card declined | 4000 0000 0000 0002 | Stripe says the card was declined. Nothing unlocked. You can try another card | |
| 5 | Not enough funds | 4000 0000 0000 9995 | Stripe says insufficient funds. Nothing unlocked | |
| 6 | Close the tab right after paying | 4242, then close the tab as soon as you press Pay | Open the app again: unlocked (the webhook did it) | |
| 7 | Restore on another browser | Paste the code from test 1 into `/focus/restore` in a different browser | Unlocked | |
| 8 | Restore with the pass code in each app | Paste the pass code into each app's restore page, and into `/personality/pass` | Unlocked in each. Personality: every full and couple report opens | |
| 8b | Pass on a different domain | On the pass thanks page (or `/pass/` with your pass), tap "Focus on another address (test)". It opens the app at micro-router-preview.micro-router.workers.dev, which has its own storage | Unlocked with no typing | |
| 9 | Refund | Stripe Dashboard, test mode, Payments, open the test 1 payment, Refund (full amount) | The four code apps: locked again the next time you open the app. Personality: report locked at once. A refunded pass: apps stop honoring it within a day (they re-check once a day) | |
| 10 | Dispute | 4000 0000 0000 0259 | The payment goes through, then Stripe opens a dispute. The return page says the payment was refunded or disputed. Nothing unlocked | |
| 11 | Kill switch | Tell me which app, or run the two commands below for focus | Buy button says "Unlocks open soon". Unlocks already bought still work | |
| 12 | Back button during checkout | Start a checkout, press Android Back on Stripe's page | Back in the app, nothing broken, can start again | |
| 13 | Google Pay | Android Chrome, on Stripe's page | Google Pay is offered and pays in test mode | |
| 14 | Webhook replay | Stripe Dashboard, Developers, Events, open a `checkout.session.completed` event, Resend. Or with the Stripe CLI: `stripe events resend <evt id> --webhook-endpoint <we id>` | Nothing doubled: still one unlock, one log entry | |
| 15 | Reconcile | `pnpm --filter @micro/scripts reconcile --from 2026-10-16 --staging` | "No mismatches." | |
| 16 | Device cap | Use one code on 6 browsers or devices (Chrome, a Chrome incognito window, Firefox, Samsung Internet, another phone, the PC) | The 6th says "This code is already in use on 5 devices. Contact us at help@polymadlabs.com if that's wrong." | |
| 17 | Reissue | `pnpm --filter @micro/scripts reissue-code --app pass --code <your test pass code> --staging` | Prints a new code. The old one stops working, the new one works | |
| 18 | Production is closed | Open https://polymadlabs.com/focus/unlock, `/pass/` and a personality report | Buy buttons say "Unlocks open soon". No TEST MODE label | |

**Commands**

Kill switch for one app on staging (test 11), from `apps/focus`, then back on:

```bash
printf 'false' | pnpm exec wrangler pages secret put PAYMENTS_ENABLED --project-name micro-focus --env preview
pnpm build && pnpm exec wrangler pages deploy dist --project-name micro-focus --branch staging
# after the test:
printf 'true' | pnpm exec wrangler pages secret put PAYMENTS_ENABLED --project-name micro-focus --env preview
pnpm build && pnpm exec wrangler pages deploy dist --project-name micro-focus --branch staging
```

Scripts (tests 15 and 17) need the test key first, from the repo root:

```bash
export STRIPE_SECRET_KEY=$(grep '^STRIPE_SECRET_KEY=' apps/focus/.env | cut -d= -f2-)
```

## Already run by Claude (headless Chromium and the API, Oct 16, 2026)

These passed on staging. They are not a substitute for your phone run, which checks real devices, Google Pay, Apple Pay and the confirmation step.

| # | What ran | Result |
| --- | --- | --- |
| 1 | 4242 purchases of focus, breathwork, intention and the pass | Unlocked, code shown, webhooks delivered (0 pending) |
| 2 | Pass bought; "Open ..." for all five apps from the thanks page | Each app unlocked with no typing; the token left the address bar at once |
| 4, 5 | 4000 0000 0000 0002 and 4000 0000 0000 9995 | Stripe showed the decline; nothing unlocked |
| 8 | Pass code typed into breathwork, attention (lower case, spaces) and intention restore pages, and the pass page | Unlocked |
| 8b | "Focus on another address (test)" | Unlocked on the workers.dev address, whose storage holds only Focus's own data |
| 9 | Full refund of a breathwork purchase through the API | The code stopped working within seconds; the log shows `refund:revoked` |
| 10 | 4000 0000 0000 0259 on breathwork and focus | The dispute arrived before the payment confirmation; the purchase still ended `disputed`; the page says so |
| 15 | reconcile on staging | No mismatches, no codes look shared |
| 16 | One focus code on 6 device ids, then reset-devices | 6th refused with `device_limit`; after the reset it worked |
| 17 | reissue-code on a staging focus purchase | Old code `unknown`, new code `active` |
| 18 | polymadlabs.com, all five apps and the pass at 375, 768 and 1280 px | "Unlocks open soon", no TEST MODE label, no console errors |
| Rate limit | 11 wrong codes in a minute | The 11th got 429 |
