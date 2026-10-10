# focus

Binaural tone player with presets and a prime-before-work mode.

- Path: `/focus/` (set by `base` in `app.config.ts`)
- Site port: 3002 (Vite dev and preview, strictPort)
- Functions port: 8802 (`wrangler pages dev`, reached through the Vite `/api` proxy)
- Run: `pnpm dev:focus` from the repo root, then open http://localhost:3002/focus/

This app owns its own design. Only edit files inside `apps/focus/`. See the root CLAUDE.md for the shared rules.
