# breathwork

Guided breathing timer (cyclic sigh, box, 4-7-8).

- Path: `/breathwork/` (set by `base` in `app.config.ts`)
- Site port: 3003 (Vite dev and preview, strictPort)
- Functions port: 8803 (`wrangler pages dev`, reached through the Vite `/api` proxy)
- Run: `pnpm dev:breathwork` from the repo root, then open http://localhost:3003/breathwork/

This app owns its own design. Only edit files inside `apps/breathwork/`. See the root CLAUDE.md for the shared rules.
