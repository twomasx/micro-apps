# intention

Fixed-length random number intention trials with server-side random numbers and a global results dashboard.

- Path: `/intention/` (set by `base` in `app.config.ts`)
- Site port: 3005 (Vite dev and preview, strictPort)
- Functions port: 8805 (`wrangler pages dev`, reached through the Vite `/api` proxy)
- Run: `pnpm dev:intention` from the repo root, then open http://localhost:3005/intention/

This app owns its own design. Only edit files inside `apps/intention/`. See the root CLAUDE.md for the shared rules.
