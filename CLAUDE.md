# micro-apps

Five small web apps in one pnpm monorepo, served under one domain (polymadlabs.com) through a Cloudflare Worker router. Each app is Vite + React + TypeScript with its own Cloudflare Pages Functions.

## Ports and paths

| App         | Path          | Site port | Functions port |
|-------------|---------------|-----------|----------------|
| router      | /             | 3000      | -              |
| personality | /personality/ | 3001      | 8801           |
| focus       | /focus/       | 3002      | 8802           |
| breathwork  | /breathwork/  | 3003      | 8803           |
| attention   | /attention/   | 3004      | 8804           |
| intention   | /intention/   | 3005      | 8805           |

Ports are fixed (`strictPort: true`). If a port is taken, stop the other process; do not change the port.

## Running

We work in WSL (Ubuntu, bash). Keep the repo in the Linux filesystem (`~/dev/micro-apps`), never under `/mnt/c`. Use Node 24 (`nvm use`) and the Linux pnpm from corepack, not the Windows one.

- `pnpm install`
- `pnpm dev:<app>` starts the site and its functions together, e.g. `pnpm dev:focus`, then open `http://localhost:3002/focus/` in the Windows browser.
- `pnpm dev:router` starts the router on http://localhost:3000. It forwards `/<app>/*` to that app's dev server, so the app must be running too.
- `pnpm typecheck`, `pnpm build` and `pnpm lint` cover the whole repo.
- Local secrets go in `apps/<app>/.env` (copy `.env.example`). Never commit a `.env` file.

## Rules

- Each app owns its own design. No shared UI, no shared CSS, no shared components. Every app must look completely different.
- Never edit another app's folder. A session working on one app only touches `apps/<that app>/`.
- Only one session edits `packages/` at a time. Message the other sessions when you change a package.
- No outside analytics, error-tracking or feature-flag services. We will build our own later.
- Payments are Stripe Checkout in test mode only, through `@micro/payments`. No real keys.
- Prices live in `apps/<app>/config/products.json`, never in code.
- TypeScript strict everywhere.

## Mobile first

- Test on Android Chrome first, then iPhone Safari, then desktop.
- Base CSS is the phone layout. Use `min-width` media queries only: 640px for tablet, 1024px for desktop.
- Keep `viewport-fit=cover` and safe-area padding (`env(safe-area-inset-*)`).
- Body text is 16px minimum.

## Per-app conventions

- `app.config.ts` holds the app name, base path and ports. Vite `base`, the PWA manifest scope and the service worker scope all come from `base`. Moving an app to its own domain is that one line.
- Call the backend as `${import.meta.env.BASE_URL}api/...`, not `/api/...`, because all five apps share one domain. Functions live in `functions/api/`.
- All five apps share one origin, so prefix every browser storage key with the app name. Use `createStorage(appConfig.name)` and `storageKey(appConfig.name, key)` from `@micro/platform`.
- The service worker only runs in `pnpm build` + `vite preview`, not in dev.

## Packages

- `packages/payments`: `PaymentsProvider` interface (`createCheckout`, `verifyPurchase`, `handleWebhook`) with a Stripe implementation. Not wired to any route yet.
- `packages/platform`: web wrappers for haptics, IndexedDB storage, share and audio unlock-on-tap.
- `packages/config`: shared tsconfig and ESLint config only.

Packages are consumed as TypeScript source (`workspace:*`); they have no build step.
