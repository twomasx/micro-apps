# Deploying

How polymadlabs.com is put together and how to deploy it. First deployed on Oct 12, 2026.

A push to GitHub does not deploy anything. Every deploy is a command run from this repo.

## What runs where

| Piece | Cloudflare resource | Address |
| --- | --- | --- |
| Router | Worker `micro-router` | https://polymadlabs.com and https://www.polymadlabs.com |
| Router, for trying changes | Worker `micro-router-preview` | https://micro-router-preview.micro-router.workers.dev |
| Personality app | Pages project `micro-personality` | https://micro-personality.pages.dev |
| Personality database | D1 `micro-personality` | id in `apps/personality/wrangler.jsonc` |
| Focus app | Pages project `micro-focus` | https://micro-focus.pages.dev |
| Focus database | D1 `micro-focus` | id in `apps/focus/wrangler.jsonc` |
| Breathwork app | Pages project `micro-breathwork` | https://micro-breathwork.pages.dev |
| Breathwork database | D1 `micro-breathwork` | id in `apps/breathwork/wrangler.jsonc` |

Everything is on one Cloudflare account, ID `34c19fb036b065cce151f13f34ff8137`. The domain is on the same account. Wrangler on Roger's WSL machine is logged in to it (`pnpm exec wrangler whoami`).

## How a request travels

1. `polymadlabs.com` and `www.polymadlabs.com` are custom domains of the router Worker. Cloudflare made the DNS record for each one, proxied (orange cloud). Do not add or edit records for these two names by hand.
2. `www` redirects (308) to the same path on `polymadlabs.com`. Browser storage is kept per hostname, so the apps must be served from one hostname only.
3. `/` is a plain placeholder page with links to `/personality/` and `/breathwork/`.
4. `/personality/...`, `/focus/...` and `/breathwork/...` are forwarded to their Pages projects with the app prefix removed from the path. Each app is built with its base path (`/personality/`, `/focus/`, `/breathwork/`), so its links, assets and service worker all stay under that path.
5. `/attention/` and `/intention/` say "Coming soon" with status 200 until the app is listed in `LIVE_APPS`.
6. Everything else is a 404.

The router also adds `no-transform` to the `Cache-Control` header of every HTML page. Without it Cloudflare adds its Web Analytics script to our pages, and we allow no outside analytics.

## Deploy the personality app

From `apps/personality`:

```bash
pnpm build
pnpm exec wrangler pages deploy dist --project-name micro-personality --branch main
```

Run the four checks from the repo root first: `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm build`.

If you edited anything in `content/`, run `pnpm --filter @micro/personality content` before building. A test fails if you forget.

### Database changes

After adding a file to `apps/personality/migrations/`, apply it to production before deploying the code that needs it:

```bash
pnpm exec wrangler d1 migrations apply DB --remote
```

Local development uses its own SQLite file and is not touched by this.

### Secrets

Three secrets live in the Pages project, not in the repo:

| Name | Value |
| --- | --- |
| `STRIPE_SECRET_KEY` | The Stripe secret key. Test mode (`sk_test_...`) until Roger says otherwise. |
| `STRIPE_WEBHOOK_SECRET` | The signing secret of the Stripe webhook below (`whsec_...`). |
| `PUBLIC_ORIGIN` | `https://polymadlabs.com`. Stripe Checkout sends buyers back here. |

Set one with:

```bash
pnpm exec wrangler pages secret put <NAME> --project-name micro-personality
```

A changed secret only takes effect after the next deploy.

## Deploy the focus app

First deployed on Oct 13, 2026. From `apps/focus`:

```bash
pnpm build
pnpm exec wrangler pages deploy dist --project-name micro-focus --branch main
```

Run the four checks from the repo root first. Database changes work as for personality: apply a new file in `apps/focus/migrations/` with `pnpm exec wrangler d1 migrations apply DB --remote` before deploying the code that needs it.

### Secrets

Four secrets live in the `micro-focus` Pages project:

| Name | Value |
| --- | --- |
| `STRIPE_SECRET_KEY` | The same test mode key as personality. |
| `STRIPE_WEBHOOK_SECRET` | The signing secret of the focus webhook (see Stripe below). Saved at `~/.config/polymadlabs/focus-stripe-webhook-secret`. |
| `UNLOCK_CODE_SECRET` | 64 hex characters. Unlock codes are made from it. **Never change it**, or every code already sold stops working. Saved at `~/.config/polymadlabs/focus-unlock-code-secret`. |
| `PUBLIC_ORIGIN` | `https://polymadlabs.com` |

Set one with `pnpm exec wrangler pages secret put <NAME> --project-name micro-focus`, then deploy again.

## Deploy the breathwork app

First deployed on Oct 14, 2026. From `apps/breathwork`:

```bash
pnpm build
pnpm exec wrangler pages deploy dist --project-name micro-breathwork --branch main
```

Run the four checks from the repo root first. Database changes work as for the other apps: apply a new file in `apps/breathwork/migrations/` with `pnpm exec wrangler d1 migrations apply DB --remote` before deploying the code that needs it.

### Secrets

Four secrets live in the `micro-breathwork` Pages project:

| Name | Value |
| --- | --- |
| `STRIPE_SECRET_KEY` | The same test mode key as personality and focus. |
| `STRIPE_WEBHOOK_SECRET` | The signing secret of the breathwork webhook (see Stripe below). Saved at `~/.config/polymadlabs/breathwork-stripe-webhook-secret`. |
| `UNLOCK_CODE_SECRET` | 64 hex characters, its own, not focus's. **Never change it**, or every code already sold stops working. Saved at `~/.config/polymadlabs/breathwork-unlock-code-secret`. |
| `PUBLIC_ORIGIN` | `https://polymadlabs.com` |

Set one with `pnpm exec wrangler pages secret put <NAME> --project-name micro-breathwork`, then deploy again.

## Deploy the attention app

First deployed on Oct 15, 2026. From `apps/attention`:

```bash
pnpm build
pnpm exec wrangler pages deploy dist --project-name micro-attention --branch main
```

Run the four checks from the repo root first. D1 database `micro-attention` (id `06687a75-5da8-4dce-9535-185589abe577`) has two tables: `purchases` and `test_results`. Apply a new file in `apps/attention/migrations/` with `pnpm exec wrangler d1 migrations apply DB --remote` before deploying the code that needs it.

### Secrets

Four secrets live in the `micro-attention` Pages project:

| Name | Value |
| --- | --- |
| `STRIPE_SECRET_KEY` | The same test mode key as the other apps. |
| `STRIPE_WEBHOOK_SECRET` | The signing secret of the attention webhook (see Stripe below). Saved at `~/.config/polymadlabs/attention-stripe-webhook-secret`. |
| `UNLOCK_CODE_SECRET` | 64 hex characters, its own. **Never change it**, or every code already sold stops working. Saved at `~/.config/polymadlabs/attention-unlock-code-secret`. |
| `PUBLIC_ORIGIN` | `https://polymadlabs.com` |

Set one with `pnpm exec wrangler pages secret put <NAME> --project-name micro-attention`, then deploy again. Right after secrets change, the first few requests can still reach the deployment from before.

### Test results

`POST /attention/api/tests` stores anonymous test summaries and `GET /attention/api/norms?length=quick|full` serves the comparison, cached for an hour. Don't take real tests on polymadlabs.com to check a deploy: every result there counts toward the comparison that users see. Check the API with a bad body instead (it answers 400), or delete check rows afterwards with `pnpm exec wrangler d1 execute DB --remote --command "DELETE FROM test_results WHERE id = '...'"`.

## Deploy the router

From `router`:

```bash
pnpm exec wrangler deploy --env preview   # try it on the workers.dev address first
pnpm exec wrangler deploy --env=""        # production: polymadlabs.com and www
```

### Turning on the next app

1. Deploy the app as its own Pages project (`micro-focus` and so on), built with its base path.
2. In `router/wrangler.jsonc`, add the app to `LIVE_APPS` and set its `<APP>_ORIGIN` to the real Pages address. Do this in both the top-level `vars` and the `preview` `vars`.
3. Deploy the router to preview, check the app there, then deploy production.

For a minute or so after a router deploy, some requests still reach the old version, so an app that was just turned on can answer 404 now and then. Wait until checks pass several times in a row before calling it broken.

## Stripe

- Test mode. The code refuses a key that does not start with `sk_test_`. Going live needs a change in `packages/payments/src/stripe.ts` as well as live keys.
- Webhook: `https://polymadlabs.com/personality/api/stripe/webhook`, event `checkout.session.completed`, endpoint id `we_1UPxeIIbd3re6uBdIm3vv1hN`. Its signing secret was saved on Roger's machine at `~/.config/polymadlabs/stripe-webhook-secret`, outside the repo.
- If the webhook is ever recreated, it gets a new signing secret: put it in `STRIPE_WEBHOOK_SECRET` and deploy again.
- Focus webhook: `https://polymadlabs.com/focus/api/stripe/webhook`, event `checkout.session.completed`, endpoint id `we_1UQKYbIbd3re6uBdDLYYIVQB`. Signing secret at `~/.config/polymadlabs/focus-stripe-webhook-secret`.
- Breathwork webhook: `https://polymadlabs.com/breathwork/api/stripe/webhook`, event `checkout.session.completed`, endpoint id `we_1UQVAQIbd3re6uBdkogYUm05`. Signing secret at `~/.config/polymadlabs/breathwork-stripe-webhook-secret`.
- Attention webhook: `https://polymadlabs.com/attention/api/stripe/webhook`, event `checkout.session.completed`, endpoint id `we_1UQyQJIbd3re6uBdJJZSk73e`. Signing secret at `~/.config/polymadlabs/attention-stripe-webhook-secret`.
- Every webhook gets the checkout events of every app on the account. Each app ignores sessions it did not create.
- Local development uses the Stripe CLI and its own secret. See "Testing payments locally" in `apps/personality/CLAUDE.md` and `apps/focus/CLAUDE.md`.

## Check a deploy

Quick checks from a terminal:

```bash
curl -s https://polymadlabs.com/personality/api/health        # {"ok":true}
curl -s -o /dev/null -w '%{http_code}\n' https://polymadlabs.com/focus/   # 200
curl -s -o /dev/null -w '%{http_code}\n' https://polymadlabs.com/nope     # 404
curl -s -o /dev/null -w '%{redirect_url}\n' https://www.polymadlabs.com/  # https://polymadlabs.com/
```

The full list, in a browser at 375px, 768px and 1280px. All of it passed on Oct 12, 2026 in headless Chromium:

1. `/` shows "PolymadLabs" and links to `/personality/`.
2. Assets and the service worker load from `/personality/`. Nothing loads from another site.
3. Take the whole test. It ends on a result with a summary.
4. Reload the `/personality/r/<id>` page. It shows the result, not a 404.
5. Open the full report offer. It says "$9.99 once. No renewals."
6. Pay with card 4242 4242 4242 4242. You come back to the unlocked report. It is still unlocked after a reload.
7. Open the result's compare link in another browser, take the test, land on the comparison.
8. Pay for the couple report ($7.99). It unlocks for both people.
9. In Stripe, the two `checkout.session.completed` events show no pending webhook deliveries.
10. `/personality/science` and `/personality/privacy` show, and the footer links to both.
11. "Delete this result" removes each test result. Its page then says "Result not found".
12. No console errors, and no page scrolls sideways.

Delete your test results when you are done. Their purchase rows stay in the database by design.

### Check focus

Passed on Oct 13, 2026 in headless Chromium, through the preview router and then polymadlabs.com:

1. `curl -s https://polymadlabs.com/focus/api/health` gives `{"ok":true}`.
2. `/focus/` plays at 375px, 768px and 1280px. Everything loads from polymadlabs.com, the service worker scope is `/focus/`, no console errors, no sideways scroll.
3. The evidence label opens `/focus/science` at that preset.
4. `/focus/unlock` says "$6.99 once. No renewals." Pay with card 4242 4242 4242 4242. You come back to "Thank you. Focus is unlocked on this device." with a code in groups of four. A reload shows the same code.
5. Relaxed and Deep have no lock after paying.
6. In another browser, `/focus/restore` with that code (lower case and spaces are fine) unlocks it there too.
7. In Stripe, the `checkout.session.completed` event shows 0 pending webhooks, and the row in D1 `micro-focus` is `paid` with a 64-character hash and no code.

One test purchase from that check is in the production database (`cs_test_a1CV2u...`, test mode).

### Check breathwork

Passed on Oct 14, 2026 in headless Chromium, through the preview router and then polymadlabs.com:

1. `curl -s https://polymadlabs.com/breathwork/api/health` gives `{"ok":true}`. The home page links to `/breathwork/`.
2. `/breathwork/` breathes at 375px, 768px and 1280px: the first-run card, Start, the dot moving. Everything loads from polymadlabs.com, the service worker scope is `/breathwork/`, no console errors, no sideways scroll.
3. The evidence label opens `/breathwork/science` at that technique.
4. `/breathwork/unlock` says "$4.99 once. No renewals." Pay with card 4242 4242 4242 4242. You come back to "Thank you. Breathwork is unlocked on this device." with a code in groups of four. A reload shows the same code.
5. Resonant has no lock after paying, and runs full sessions instead of the 1 minute preview.
6. In another browser, `/breathwork/restore` with that code (lower case and spaces are fine) unlocks it there too. A wrong code is refused.
7. In Stripe, the `checkout.session.completed` event shows 0 pending webhooks, and the row in D1 `micro-breathwork` is `paid` with a 64-character hash and no code.

One test purchase from that check is in the production database (`cs_test_a1iypjsyee...`, test mode), and one unpaid `pending` row from a direct API check.

### Check attention

Passed on Oct 15, 2026 in headless Chromium, through the preview router and then polymadlabs.com:

1. `curl -s https://polymadlabs.com/attention/api/health` gives `{"ok":true}`. `/attention/progress` and `/attention/science` load directly (200). The home page links to `/attention/`.
2. At 375px, 768px and 1280px: Today, Begin, the first-session instructions, Begin, a stretch, "I stayed", End, Session ended. Everything loads from polymadlabs.com, the service worker scope is `/attention/`, no console errors, no sideways scroll.
3. `/attention/unlock` says "$6.99 once. No renewals." Pay with card 4242 4242 4242 4242 (untick Stripe's "save with Link", or it asks for a phone number). You come back to "Thank you. Attention is unlocked on this device." with a code in groups of four. The 15 and 20 minute sizes and the study schedule unlock.
4. In another browser, `/attention/restore` with that code (lower case and spaces are fine) unlocks it there too. A malformed code gets the format hint.
5. In Stripe, the `checkout.session.completed` event shows 0 pending webhooks, and the row in D1 `micro-attention` is `paid` with a 64-character hash and no code.
6. `test_results` on production is still empty (no tests were taken there).

One test purchase from that check is in the production database (`cs_test_a15CDWiO...`, test mode).

## Undo

- **A bad app deploy:** Pages keeps every deployment. `pnpm exec wrangler pages deployment list --project-name micro-personality` shows them. Roll back in the Cloudflare dashboard (Workers & Pages, `micro-personality`, Deployments), or check out the last good commit and deploy it again.
- **A bad router deploy:** `pnpm exec wrangler rollback` from `router`, or deploy the last good commit again.
- **Taking the site off the domain:** remove the two custom domains from `micro-router` in the dashboard. That also removes their DNS records.

## Known gaps

- Nothing has been checked on a real Android phone or in iPhone Safari. For focus this matters most: playing with the screen off and the lock screen controls (see `apps/focus/DESIGN-TODO.md`). For breathwork: tones, vibration and the screen staying awake (see `apps/breathwork/DESIGN-TODO.md`). For attention: the three sounds, vibration, the screen staying awake, and the test's timing on a 90 Hz or 120 Hz screen (see `apps/attention/DESIGN-TODO.md`).
- The home page at `/` links to the personality test, breathwork and attention. Focus is live but not linked from it yet.
- Every file in `apps/personality/content/` still says `status: draft`.
- Cloudflare's Web Analytics is blocked by the router's header, but it is still switched on for the domain. Switch it off in the dashboard (Analytics & Logs, Web Analytics) so the block is not the only thing in the way.
- Unpaid checkouts leave `pending` rows in `purchases`, in both apps. Nothing clears them yet.
- The PWA has no icons or theme color yet (see `apps/personality/DESIGN-TODO.md`).
