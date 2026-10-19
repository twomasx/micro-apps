# The PolymadLabs pass

Path `/pass/`, at polymadlabs.com for good. Site port 3007, functions port 8807. Run with `pnpm dev:pass`.

One purchase ($19.99, in `config/products.json`) unlocks everything in every PolymadLabs app, including apps added later. The full plan is PAYMENTS.md in the repo root.

- **Design:** the landing page's Lab Index look (IBM Plex, thin rules, one orange accent), done by Claude at Roger's request. Styles in `src/styles.css`; what was decided is in `DESIGN-TODO.md`. Roger can change any of it.
- **Nothing depends on the apps sharing a domain.** Apps never read this service's storage or database. Each app keeps its own copy of the pass code (`<app>:pass`) and asks `POST /pass/api/verify`, through `createPassState` in `@micro/payments/pass`. App servers that check passes themselves (personality, intention) use `requestHasPass` from `@micro/payments/server`.
- **Codes** are made from `PASS_CODE_SECRET` and the Stripe session (see `packages/payments/src/pass-codes.ts`). Only their hash is stored. Never change the secret once real codes exist.
- **One-time tokens** carry a pass into an app with no typing: the pass pages make one per tap (`POST /api/token`), the app trades it for the code once (`POST /api/redeem`). 10 minutes, single use, stored as a hash.
- **CORS:** `ALLOWED_ORIGINS` in `wrangler.jsonc`, per environment. Add an app's own domain there when it moves.
- **Search (SEO.md):** `/` and `/privacy/` are prerendered at build time (`src/seo.ts`, `src/prerender.tsx`); `/thanks` and `/restore` are a noindex shell. `public/pass-hint.js` runs before the first paint and hides the offer for a browser that holds a pass (flag `pass:has-pass`, kept in step by `src/lib/pass-hint.ts`), so pass holders never see the offer flash before "Your pass".
- The landing page reads `pass:pass` from this site's storage to open apps with a token. Keep that key and its shape (`SavedPass` in `packages/payments/src/pass.ts`).

## API (Pages Functions in `functions/api/`)

| Method and path | Does |
| --- | --- |
| `GET /api/health` | `{ "ok": true }` |
| `GET /api/payments` | Kill switch, mode and environment |
| `POST /api/checkout` | Stripe Checkout for `pass`. Returns to `/pass/thanks` |
| `POST /api/stripe/webhook` | Signed Stripe events: payment, refund, dispute |
| `GET /api/purchase/:sessionId` | For the thanks page: confirms payment and returns the pass code |
| `POST /api/verify` | `{ code, deviceId, app }` to `{ valid, status }`: `active`, `refunded`, `disputed`, `unknown`, `device_limit` |
| `POST /api/token` | `{ code }` to a one-time token |
| `POST /api/redeem` | `{ token, deviceId, app }` to `{ code, valid, status }`, or 410 |
| `GET /api/links` | The apps the thanks page opens |

## Screens

| Route | What it does |
| --- | --- |
| `/` | The offer, or "Your pass is on this device" with buttons that open each app |
| `/thanks` | After checkout: the code and the app buttons |
| `/restore` | Enter a pass code |
| `/privacy` | What is stored |
