# attention

2 minute sustained attention test (SART based) with score and percentile.

- Path: `/attention/` (set by `base` in `app.config.ts`)
- Site port: 3004 (Vite dev and preview, strictPort)
- Functions port: 8804 (`wrangler pages dev`, reached through the Vite `/api` proxy)
- Run: `pnpm dev:attention` from the repo root, then open http://localhost:3004/attention/

This app owns its own design. Only edit files inside `apps/attention/`. See the root CLAUDE.md for the shared rules.
