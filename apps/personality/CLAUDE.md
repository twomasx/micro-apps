# personality

Big Five based 16-type personality test with percentages per axis and a compatibility checker.

- Path: `/personality/` (set by `base` in `app.config.ts`)
- Site port: 3001 (Vite dev and preview, strictPort)
- Functions port: 8801 (`wrangler pages dev`, reached through the Vite `/api` proxy)
- Run: `pnpm dev:personality` from the repo root, then open http://localhost:3001/personality/

This app owns its own design. Only edit files inside `apps/personality/`. See the root CLAUDE.md for the shared rules.
