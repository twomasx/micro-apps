# PolymadLabs micro apps

Five small web apps, built one per day (Oct 12 to 16, 2026), all served from polymadlabs.com under their own path. Each app makes money through optional one-time unlocks. No ads, no subscriptions, no LLMs inside the apps.

| App | Path | Site port | Functions port | Day |
| --- | --- | --- | --- | --- |
| personality | /personality/ | 3001 | 8801 | Mon |
| focus | /focus/ | 3002 | 8802 | Tue |
| breathwork | /breathwork/ | 3003 | 8803 | Wed |
| attention | /attention/ | 3004 | 8804 | Thu |
| intention | /intention/ | 3005 | 8805 | Fri |
| landing | / (files under /_landing/) | 3006 | none | |
| pass (all-app pass service) | /pass/ | 3007 | 8807 | |
| router | (all of polymadlabs.com) | 3000 | none | |

Run an app: `pnpm dev:<app>` (site and functions together). Router: `pnpm dev:router`. Checks: `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm build`. All four cover the whole repo. `pnpm test` runs the `test` script of every workspace that has one (Vitest).

## Who does what

- **Roger owns design.** All visual style, layout, typography, color, motion and UX decisions are his. Every app gets its own design. Nothing visual is shared between apps.
- **Claude owns everything else:** logic, scoring, data, API, payments, storage, tests, accessibility, performance, content drafts, deploy config.
- Build UI as plain semantic HTML with no styling. Use clear class names and `data-*` attributes for state (`data-state="active"`, `data-selected="true"`) so Roger can style without touching logic.
- Keep logic out of components. Put it in plain TypeScript modules and hooks, so components are thin and easy to restyle or rewrite.
- Do not add CSS, fonts, colors, icons, animation libraries, UI kits or CSS frameworks unless Roger asks. A tiny reset and the mobile rules below are the only exceptions.
- When a feature needs a design or UX decision, build the simplest working version and add the decision to the app's `DESIGN-TODO.md`. Don't decide it yourself.

## One app at a time

- Roger builds one app per session, in the main checkout. No worktrees.
- Only edit the folder of the app being built. Changes to `packages/` are fine when needed, but say what changed so other apps aren't surprised later.
- Use only that app's fixed ports (`strictPort: true`). Never change a port to get around a conflict; find what is using it and stop it.
- When the app is done, commit and push to `main` before the next app starts.

## Git

- Remote: `git@github.com:twomasx/micro-apps.git`, branch `main`. SSH is already set up.
- Small commits with plain messages ("Add scoring with tests").
- Commit messages and pull requests carry no AI attribution: no `Co-Authored-By` line, no "Generated with" line, and no tool names in the message.
- Never force push. Never commit `.env` files or real keys. Only `.env.example` belongs in the repo.
- If `pnpm-lock.yaml` conflicts on merge, take either side, run `pnpm install`, commit the result.

## Environment

- Roger works in WSL (Ubuntu, bash). The repo lives in the Linux filesystem at `~/dev/micro-apps`, never under `/mnt/c`. Scripts must work in bash.
- Node 24 (`nvm use`) and the Linux pnpm from corepack, not the Windows one. `pnpm install` after pulling.
- Local secrets go in `apps/<app>/.env` (copy `.env.example`).
- He opens the apps from his Windows browser at `http://localhost:<port>/<path>/`.
- His main device is an Android phone. Test order: Android Chrome first, then iPhone Safari, then tablet, then desktop.

## Mobile first (applies to all code and any CSS)

- Base styles are the phone layout. Only `min-width` queries: 640px tablet, 1024px desktop. No `max-width` overrides.
- `viewport-fit=cover` and safe-area padding on anything fixed to the screen edge.
- Body and input text at least 16px, so phones don't zoom into inputs.
- Touch targets at least 44px, primary actions 48px.
- Pointer events, so mouse, touch and pen share one code path. Every hover action also works by tap.
- The Android Back button closes open sheets and dialogs before it leaves the page (use history state).
- The page never scrolls sideways.
- Budget per app on a mid-range phone over 4G: 150KB gzipped JavaScript or less, largest paint under 2.5s, 60fps animation.

## Data and privacy

- No outside analytics, error tracking or feature-flag services. We will build our own admin dashboard later.
- All five apps share one domain, so every browser storage key starts with the app name (`personality:`).
- Don't collect names or emails. Stripe collects the email for receipts; we don't copy it into our database.
- Result and record IDs are random and unguessable (at least 12 characters). Never sequential.
- Every app writes a short privacy note page in plain words: what is stored, where, and for how long.

## Payments

- Stripe Checkout. Live in production since Oct 19, 2026 (Roger's go-ahead); staging stays in test mode. Never test with real cards except the go-live checks Roger runs himself.
- Always go through `packages/payments`. Never call Stripe directly from an app.
- Prices live in `apps/<app>/config/products.json`, never in code or copy. Client and functions both read that one file.
- Unlocks are confirmed on the server from the Stripe webhook (signature verified). The client never decides on its own that something is paid.
- Every price shown says it is one-time: "$9.99 once. No renewals."

## Per-app conventions

- TypeScript strict everywhere.
- `app.config.ts` holds the app name, base path and ports. Vite `base`, the PWA manifest scope and the service worker scope all come from `base`. Moving an app to its own domain is that one line.
- Call the backend as `${import.meta.env.BASE_URL}api/...`, not `/api/...`, because all five apps share one domain. Functions live in `functions/api/`.
- For browser storage use `createStorage(appConfig.name)` and `storageKey(appConfig.name, key)` from `@micro/platform`, so keys get the app-name prefix.
- The service worker only runs in `pnpm build` + `vite preview`, not in dev.

## Packages

- `packages/payments`: `PaymentsProvider` interface (`createCheckout`, `verifyPurchase`, `handleWebhook`) with a Stripe implementation. `@micro/payments/server` holds the shared purchase logic for Pages Functions (purchases table, Stripe events, refunds, disputes, payment log); `@micro/payments/settings` the kill switch and mode; `@micro/payments/client` browser helpers. See PAYMENTS.md.
- `scripts`: admin scripts Roger runs in WSL (`pnpm --filter @micro/scripts <name>`): stripe-sync, reconcile, find-purchase, reissue-code.
- `packages/platform`: web wrappers for haptics, IndexedDB storage, share and audio unlock-on-tap.
- `packages/config`: shared tsconfig and ESLint config only.

Packages are consumed as TypeScript source (`workspace:*`); they have no build step.

## Honest claims

- Every app is based on published science. Say what the research found, at the strength it found it.
- Never say "rewires your brain", "syncs your brainwaves", "treats", "cures", "clinically proven" or "scientifically accurate".
- When a result could be chance, say so with a number ("About 1 in 20 people get a result like this by chance").
- Each app has a "The science" page with plain sources.

## Writing (all copy and content)

- Plain, direct, literal wording a broad audience can read. Name the thing.
- Speak to the user as "you". Short sentences.
- No em dashes. No exclamation marks. No emoji.
- Numbers keep their units and stay exact ("68%", "94 s").

## Done means

1. `pnpm typecheck`, `pnpm test`, `pnpm lint` and `pnpm build` pass.
2. The main flow works well on phone, tablet and desktop. Check at 375px, 768px and 1280px wide.
3. No console errors.
4. JavaScript stays under the 150KB gzipped budget (report the number).
5. `DESIGN-TODO.md` lists every design decision left for Roger.

Run every check yourself and show the results. If something fails, fix it before saying it is done.
