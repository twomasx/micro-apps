# Deploying

How polymadlabs.com is put together and how to deploy it. First deployed on Oct 12, 2026.

A push to GitHub does not deploy anything. Every deploy is a command run from this repo.

## What runs where

| Piece | Cloudflare resource | Address |
| --- | --- | --- |
| Router | Worker `micro-router` | https://polymadlabs.com and https://www.polymadlabs.com |
| Router for staging | Worker `micro-router-preview` | https://staging.polymadlabs.com and https://micro-router-preview.micro-router.workers.dev |
| Personality app | Pages project `micro-personality` | https://micro-personality.pages.dev |
| Personality database | D1 `micro-personality` | id in `apps/personality/wrangler.jsonc` |
| Focus app | Pages project `micro-focus` | https://micro-focus.pages.dev |
| Focus database | D1 `micro-focus` | id in `apps/focus/wrangler.jsonc` |
| Breathwork app | Pages project `micro-breathwork` | https://micro-breathwork.pages.dev |
| Breathwork database | D1 `micro-breathwork` | id in `apps/breathwork/wrangler.jsonc` |
| Attention app | Pages project `micro-attention` | https://micro-attention.pages.dev |
| Attention database | D1 `micro-attention` | id in `apps/attention/wrangler.jsonc` |
| Intention app | Pages project `micro-intention` | https://micro-intention.pages.dev |
| Intention database | D1 `micro-intention` | id in `apps/intention/wrangler.jsonc` |
| Landing page | Pages project `micro-landing` | https://micro-landing-b6u.pages.dev (the name micro-landing was taken on pages.dev, so Cloudflare added -b6u) |
| All-app pass service | Pages project `micro-pass` | https://micro-pass.pages.dev, served at polymadlabs.com/pass/ |
| Pass databases | D1 `micro-pass` and `micro-pass-staging` | ids in `apps/pass/wrangler.jsonc` |

Everything is on one Cloudflare account, ID `34c19fb036b065cce151f13f34ff8137`. The domain is on the same account. Wrangler on Roger's WSL machine is logged in to it (`pnpm exec wrangler whoami`).

## How a request travels

1. `polymadlabs.com` and `www.polymadlabs.com` are custom domains of the router Worker. Cloudflare made the DNS record for each one, proxied (orange cloud). Do not add or edit records for these two names by hand.
2. `www` redirects (308) to the same path on `polymadlabs.com`. Browser storage is kept per hostname, so the apps must be served from one hostname only.
3. `/` is the landing page, forwarded to the `micro-landing` Pages project (`LANDING_ORIGIN`). Its files (scripts, styles, fonts, images) live under `/_landing/`, which the router forwards to the same project with `/_landing` removed.
4. `/personality/...`, `/focus/...`, `/breathwork/...`, `/attention/...`, `/intention/...` and `/pass/...` are forwarded to their Pages projects with the app prefix removed from the path. Each app is built with its base path, so its links, assets and service worker all stay under that path.
5. An app not listed in `LIVE_APPS` says "Coming soon" with status 200. Since Oct 15, 2026 all five are listed.
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

## Deploy the intention app

First deployed on Oct 15, 2026. From `apps/intention`:

```bash
pnpm build
pnpm exec wrangler pages deploy dist --project-name micro-intention --branch main
```

Run the four checks from the repo root first. D1 database `micro-intention` (id `8191fe94-bc95-4272-909b-13dedc75002e`) has two tables: `runs` and `purchases`. Apply a new file in `apps/intention/migrations/` with `pnpm exec wrangler d1 migrations apply DB --remote` before deploying the code that needs it.

`wrangler.jsonc` turns on the `enable_request_signal` compatibility flag. Without it a run whose connection drops is never told, keeps streaming into nothing and is saved as complete. Keep the flag.

### Secrets

Four secrets live in the `micro-intention` Pages project:

| Name | Value |
| --- | --- |
| `STRIPE_SECRET_KEY` | The same test mode key as the other apps. |
| `STRIPE_WEBHOOK_SECRET` | The signing secret of the intention webhook (see Stripe below). Saved at `~/.config/polymadlabs/intention-stripe-webhook-secret`. |
| `UNLOCK_CODE_SECRET` | 64 hex characters, its own. **Never change it**, or every code already sold stops working. Saved at `~/.config/polymadlabs/intention-unlock-code-secret`. |
| `PUBLIC_ORIGIN` | `https://polymadlabs.com` |

Set one with `pnpm exec wrangler pages secret put <NAME> --project-name micro-intention`, then deploy again.

### Runs are the public record

Every run started on polymadlabs.com counts in the global totals, so don't check a deploy by pulling runs on the real site and leaving them. Check with a device id you can find again, then delete those rows:

```bash
curl -sN -X POST https://polymadlabs.com/intention/api/runs -H 'Content-Type: application/json' \
  -d '{"deviceId":"deploycheck00000001","kind":"tug"}'      # streams 80 batches over 20 s
pnpm exec wrangler d1 execute DB --remote --command "DELETE FROM runs WHERE device_id = 'deploycheck00000001'"
```

Once real people use the app, only delete rows you made yourself.

## Deploy the pass service

First deployed on Oct 16, 2026. The account is on Workers Paid since then (the free plan allows only 10 D1 databases). From `apps/pass`:

```bash
pnpm build
pnpm exec wrangler d1 migrations apply DB --remote [--env preview]
pnpm exec wrangler pages deploy dist --project-name micro-pass --branch main      # or --branch staging
```

The project was created with `wrangler pages project create micro-pass --production-branch main --force`.

### Secrets

| Name | Value |
| --- | --- |
| `STRIPE_SECRET_KEY` | The test key, in both environments, until go-live. |
| `STRIPE_WEBHOOK_SECRET` | Staging only for now: the pass webhook below. Saved at `~/.config/polymadlabs/staging/pass-stripe-webhook-secret`. |
| `PASS_CODE_SECRET` | 64 hex characters. Pass codes are made from it. **Never change it.** Production: `~/.config/polymadlabs/pass-code-secret`; staging: `pass-staging-code-secret`. |
| `PASS_SERVICE_KEY` | 64 hex characters, also set on personality and intention, so their servers can ask about passes with the buyer's address for rate limits. Production: `~/.config/polymadlabs/pass-service-key`; staging: `pass-staging-service-key`. |
| `PUBLIC_ORIGIN` | `https://polymadlabs.com` (production), `https://staging.polymadlabs.com` (staging). |
| `PAYMENTS_ENABLED` | `false` in production, `true` on staging. |

`ALLOWED_ORIGINS` (who may call the pass API from a browser) and, on staging, `EXTRA_APP_LINKS` are plain variables in `apps/pass/wrangler.jsonc`. When an app moves to its own domain, add that domain to `ALLOWED_ORIGINS` for its environment.

Every app has `PASS_API_ORIGIN` in its `wrangler.jsonc`: `https://polymadlabs.com` in production, `https://staging.polymadlabs.com` on staging. Staging apps ask the staging pass service.

### Testing a pass on another domain

The staging router also answers at https://micro-router-preview.micro-router.workers.dev. It is a different origin, with its own browser storage, and it is in staging's `ALLOWED_ORIGINS`. The pass thanks page on staging has buttons for each app "on another address (test)". The apps' bare `staging.micro-<app>.pages.dev` addresses do not work for this: each app is built for its `/<app>/` path.

## Deploy the landing page

First deployed on Oct 15, 2026. From `apps/landing`:

```bash
pnpm build
../../router/node_modules/.bin/wrangler pages deploy dist --project-name micro-landing --branch main
```

The landing app has no wrangler of its own (no functions), so use the router's. Run it from `apps/landing`, not from `router`: inside `router` wrangler reads the router's `wrangler.jsonc` and refuses. There are no functions, secrets or database.

The project lives at `micro-landing-b6u.pages.dev`, because `micro-landing` was already taken on pages.dev. It was created with `wrangler pages project create micro-landing --production-branch main --force`. Without `--force`, wrangler 4.149 tries to make a Workers project instead, rewrites the app's files and fails on the workspace. Only the create step needed `--force`; deploys do not.

`dist/404.html` makes Pages answer unknown paths like `/_landing/nope` with a 404 instead of the page. Deploy the landing page **before** a router that points `LANDING_ORIGIN` at a new address, or `/` breaks until it exists.

## Deploy the router

From `router`:

```bash
pnpm exec wrangler deploy --env preview   # staging: staging.polymadlabs.com and the workers.dev address
pnpm exec wrangler deploy --env=""        # production: polymadlabs.com and www
```

The preview Worker serves staging, so its app origins are the `staging.micro-<app>.pages.dev` addresses, not production's.

**robots.txt is the router's.** It serves the whole file (`router/src/seo.ts`): everything allowed, AI training crawlers blocked, `Content-Signal: search=yes,ai-train=no`, and the `Sitemap:` line. Cloudflare's managed robots.txt can't take a Sitemap line, so when this router first goes to production, turn off the "Manage your robots.txt" setting for polymadlabs.com in the Cloudflare dashboard (under the bot or AI crawler settings), then check that `https://polymadlabs.com/robots.txt` shows the router's file.

### Turning on the next app

1. Deploy the app as its own Pages project (`micro-focus` and so on), built with its base path.
2. In `router/wrangler.jsonc`, add the app to `LIVE_APPS` and set its `<APP>_ORIGIN` to the real Pages address. Do this in both the top-level `vars` and the `preview` `vars`.
3. Deploy the router to preview, check the app there, then deploy production.

For a minute or so after a router deploy, some requests still reach the old version, so an app that was just turned on can answer 404 now and then. Wait until checks pass several times in a row before calling it broken.

## Staging

https://staging.polymadlabs.com is a full copy of the site in Stripe test mode, for trying every purchase with test cards before anything goes live. Set up on Oct 16, 2026. See PAYMENTS.md.

| Piece | Where |
| --- | --- |
| Router | Worker `micro-router-preview`, custom domain `staging.polymadlabs.com` (wrangler made its DNS record), also https://micro-router-preview.micro-router.workers.dev. It adds `X-Robots-Tag: noindex, nofollow` to everything. |
| Each app | The `staging` branch of its Pages project: `https://staging.micro-<app>.pages.dev` |
| Landing page | `https://staging.micro-landing-b6u.pages.dev` |
| Databases | D1 `micro-<app>-staging`, bound in each app's `wrangler.jsonc` under `env.preview` |

Each app's `wrangler.jsonc` has the production settings at the top and staging under `env.preview`: `PAYMENTS_MODE=test`, `ENVIRONMENT=staging` and the staging database. Pages uses `env.preview` for every branch except `main`.

Staging secrets (set with `--env preview`): `STRIPE_SECRET_KEY` (the test key), `STRIPE_WEBHOOK_SECRET` (the same signing secrets as before, see Stripe below), `UNLOCK_CODE_SECRET` (its own, saved at `~/.config/polymadlabs/<app>-staging-unlock-code-secret`), `PUBLIC_ORIGIN=https://staging.polymadlabs.com` and `PAYMENTS_ENABLED=true`.

```bash
printf '%s' "$VALUE" | pnpm exec wrangler pages secret put <NAME> --project-name micro-<app> --env preview
```

### Deploy an app to staging

From `apps/<app>`:

```bash
pnpm build
pnpm exec wrangler d1 migrations apply DB --remote --env preview   # when there is a new migration
pnpm exec wrangler pages deploy dist --project-name micro-<app> --branch staging
```

The landing page: `../../router/node_modules/.bin/wrangler pages deploy dist --project-name micro-landing --branch staging` from `apps/landing`.

The router: `pnpm exec wrangler deploy --env preview` from `router`.

Staging is the place to try a change before production: deploy it there, check it on https://staging.polymadlabs.com, then deploy to `main`.

If https://staging.polymadlabs.com fails to connect on the Windows machine only some of the time, Windows is still caching the answer from before the name existed. `ipconfig /flushdns` in a Windows terminal clears it.

## Payments kill switch

Every app reads `PAYMENTS_ENABLED`, a Pages secret. Only the exact value `true` opens checkout. Anything else, or no value, keeps it closed: buy buttons say "Unlocks open soon" and `POST <app>/api/checkout` answers 503. Unlocks already bought keep working.

Since Oct 16, 2026 it is `false` in production for all five apps, because production still runs on Stripe test keys. See PAYMENTS.md.

Flip it for one app (here focus), then deploy that app again so the new value takes effect:

```bash
cd apps/focus
printf 'false' | pnpm exec wrangler pages secret put PAYMENTS_ENABLED --project-name micro-focus   # or 'true'
pnpm build && pnpm exec wrangler pages deploy dist --project-name micro-focus --branch main
curl -s https://polymadlabs.com/focus/api/payments   # {"enabled":false,"mode":"test","environment":"production"}
```

`PAYMENTS_MODE` (`test` or `live`) and `ENVIRONMENT` are plain variables in each app's `wrangler.jsonc`. The Stripe key must match the mode (`sk_test_` or `sk_live_`), and every purchase row records the mode it was made in. An app only accepts purchases made in its own mode.

## Stripe

- Test mode. The code refuses a key that does not match `PAYMENTS_MODE` (see the kill switch above). Going live is the procedure in PAYMENTS.md section 6, not a code change.
- Since Oct 16, 2026 the five test-mode webhooks point at **staging**, not production, and receive `checkout.session.completed`, `charge.refunded` and `charge.dispute.created`. Moving them kept their signing secrets. Production has no webhook until go-live.
- Personality: `https://staging.polymadlabs.com/personality/api/stripe/webhook`, endpoint id `we_1UPxeIIbd3re6uBdIm3vv1hN`. Signing secret at `~/.config/polymadlabs/stripe-webhook-secret`.
- Focus: `https://staging.polymadlabs.com/focus/api/stripe/webhook`, endpoint id `we_1UQKYbIbd3re6uBdDLYYIVQB`. Signing secret at `~/.config/polymadlabs/focus-stripe-webhook-secret`.
- Breathwork: `https://staging.polymadlabs.com/breathwork/api/stripe/webhook`, endpoint id `we_1UQVAQIbd3re6uBdkogYUm05`. Signing secret at `~/.config/polymadlabs/breathwork-stripe-webhook-secret`.
- Attention: `https://staging.polymadlabs.com/attention/api/stripe/webhook`, endpoint id `we_1UQyQJIbd3re6uBdJJZSk73e`. Signing secret at `~/.config/polymadlabs/attention-stripe-webhook-secret`.
- Intention: `https://staging.polymadlabs.com/intention/api/stripe/webhook`, endpoint id `we_1UR18BIbd3re6uBd9Rlw0Mum`. Signing secret at `~/.config/polymadlabs/intention-stripe-webhook-secret`.
- Pass: `https://staging.polymadlabs.com/pass/api/stripe/webhook`, endpoint id `we_1URKZHIbd3re6uBdaXqgvLZx`, made by `stripe-sync --webhooks`. Signing secret at `~/.config/polymadlabs/staging/pass-stripe-webhook-secret`.
- If a webhook is ever recreated, it gets a new signing secret: put it in `STRIPE_WEBHOOK_SECRET` (`--env preview` for staging) and deploy again.
- Every webhook gets the checkout events of every app on the account. Each app ignores sessions it did not create.
- Local development uses the Stripe CLI and its own secret. See "Testing payments locally" in `apps/personality/CLAUDE.md` and `apps/focus/CLAUDE.md`.

## Code security

Unlock codes and pass codes work like keys. The rules (PAYMENTS.md section 3b), all in `packages/payments/src/server/guard.ts`:

- **Device cap:** a code works on up to 5 devices per app. Each app sends its anonymous device id (`X-Device-Id`) with every check. A 6th device gets "This code is already in use on 5 devices." The table is `code_devices`.
- **Rate limit:** every code check, right or wrong, counts toward 10 a minute and 100 a day per network address (table `rate_limits`, keys expire). Personality's and intention's servers pass the buyer's address to the pass service only with the right `PASS_SERVICE_KEY`.
- **Sharing alerts:** each check notes a scrambled (HMAC) form of the address per code and day (table `code_addresses`). `reconcile` lists codes at the device cap or checked from 10 or more addresses in a day.
- **Page security:** every site's `public/_headers` allows scripts only from itself and sends no referrer. `pnpm --filter @micro/scripts test` checks the files.

### Admin scripts

Run from the repo root. They use wrangler (logged in as Roger) and, for codes, the secrets in `~/.config/polymadlabs`. Add `--staging` for staging.

```bash
export STRIPE_SECRET_KEY=$(grep '^STRIPE_SECRET_KEY=' apps/focus/.env | cut -d= -f2-)   # the live key after go-live
pnpm --filter @micro/scripts reconcile --from 2026-10-16 [--to 2026-10-23]   # Stripe sales against every purchases table, plus sharing alerts
pnpm --filter @micro/scripts find-purchase --email buyer@example.com         # a buyer's purchases and current codes
pnpm --filter @micro/scripts reissue-code --app focus --session cs_...       # or --code ...; the old code stops working
pnpm --filter @micro/scripts reset-devices --app pass --code XXXX-XXXX-XXXX-XXXX [--for-app attention]
```

## Stripe prices

Checkout charges the Stripe price whose lookup key is `<app>:<product id>` (for example `focus:lifetime`), and refuses to start if that price differs from the app's `config/products.json`. The test-mode prices were created on Oct 16, 2026 with:

```bash
export STRIPE_SECRET_KEY=$(grep '^STRIPE_SECRET_KEY=' apps/focus/.env | cut -d= -f2-)
pnpm --filter @micro/scripts stripe-sync            # creates missing prices, stops if any differs from config
pnpm --filter @micro/scripts stripe-sync --check    # only checks
pnpm --filter @micro/scripts test                   # the same check as a test (skipped when the key is not set)
```

Stripe prices cannot be edited. To change a price: change `products.json`, archive the old Stripe price (Dashboard, Product catalog), run stripe-sync, deploy.

## Payment tables

Every app's database has `purchases` (status `pending`, `paid`, `refunded` or `disputed`; only `paid` unlocks), `stripe_events` (each Stripe event id handled once) and `payment_log` (every checkout start, webhook, verify, unlock, refund, dispute and failure). See the log with:

```bash
pnpm exec wrangler d1 execute DB --remote --env preview --command "SELECT at, action, result, session_id FROM payment_log ORDER BY id DESC LIMIT 20"
```

(without `--env preview` for production).

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

### Check landing

Passed on Oct 15, 2026, with curl and headless Chromium, through the preview router and then polymadlabs.com: `/` serves the page with all five specimens, everything under `/_landing/` loads, `/_landing/nope` and `/nope` are 404, all five app paths still answer 200, `www` redirects, no console errors and no sideways scroll at 375, 768 and 1280 px.

### Check intention

Passed on Oct 15, 2026, with curl and headless Chromium, on micro-intention.pages.dev, through the preview router and then polymadlabs.com:

1. `curl -s https://polymadlabs.com/intention/api/health` gives `{"ok":true}`. All seven pages (`/intention/`, `global`, `me`, `science`, `privacy`, `unlock`, `restore`) load directly (200). The home page links to `/intention/`.
2. A run streams in real time through the router: 80 batches about 250 ms apart, the end 20 s after the start. Nothing buffers the stream.
3. A connection dropped after 3 s is saved as `abandoned` with its 550 bits, on Pages and through the router.
4. At 375px, 768px and 1280px everything loads from polymadlabs.com, the service worker scope is `/intention/`, no console errors, no sideways scroll. A full run in the browser ends on its result with the ring's check.
5. `/intention/unlock` says "$4.99 once. No renewals." Pay with card 4242 4242 4242 4242 (untick Stripe's "save with Link"). You come back to "Thank you. Lab Pass is on for this device." with a code in groups of four, the same after a reload.
6. In another browser, `/intention/restore` with that code (lower case and spaces are fine) turns Lab Pass on there too.
7. In Stripe, the `checkout.session.completed` event shows 0 pending webhooks, and the row in D1 `micro-intention` is `paid` with a 64-character hash and no code.
8. The five check runs were deleted afterwards. `runs` on production started empty.

One test purchase from that check is in the production database (`cs_test_a1e7dNvr...`, test mode).

## Undo

- **A bad app deploy:** Pages keeps every deployment. `pnpm exec wrangler pages deployment list --project-name micro-personality` shows them. Roll back in the Cloudflare dashboard (Workers & Pages, `micro-personality`, Deployments), or check out the last good commit and deploy it again.
- **A bad router deploy:** `pnpm exec wrangler rollback` from `router`, or deploy the last good commit again.
- **Taking the site off the domain:** remove the two custom domains from `micro-router` in the dashboard. That also removes their DNS records.

## Known gaps

- Nothing has been checked on a real Android phone or in iPhone Safari. For focus this matters most: playing with the screen off and the lock screen controls (see `apps/focus/DESIGN-TODO.md`). For breathwork: tones, vibration and the screen staying awake (see `apps/breathwork/DESIGN-TODO.md`). For attention: the three sounds, vibration, the screen staying awake, and the test's timing on a 90 Hz or 120 Hz screen (see `apps/attention/DESIGN-TODO.md`). For intention: the full-screen canvas at 60 fps, the color fan and Android's color picker, Back closing sheets, and the calendar file (see `apps/intention/DESIGN-TODO.md`).
- The home page at `/` links to the personality test, breathwork, attention and intention. Focus is live but not linked from it yet.
- Every file in `apps/personality/content/` still says `status: draft`.
- Cloudflare's Web Analytics is blocked by the router's header, but it is still switched on for the domain. Switch it off in the dashboard (Analytics & Logs, Web Analytics) so the block is not the only thing in the way.
- Unpaid checkouts leave `pending` rows in `purchases`, in both apps. Nothing clears them yet.
- The PWA has no icons or theme color yet (see `apps/personality/DESIGN-TODO.md`).
