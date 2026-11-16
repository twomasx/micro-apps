# Landing page

The page at polymadlabs.com `/`. It introduces the five apps as one index: **You Are The Experiment.**

- **Design is Claude's here.** The root rule that Roger owns all design does not apply to this folder; Roger asked Claude to design it (first Lab Index, now three versions to pick from, see `DESIGN-NOTES.md`). The rule still holds for every other app.
- Static page, Vite + TypeScript, no React. The JavaScript pauses the specimen animations (`src/motion.ts`), opens apps with a pass (`src/pass-links.ts`) and, for now, runs the design switcher (`src/design.ts`).
- All words about the apps are in `src/content.ts`. Each line was checked against the app's own code. When an app changes what it does or what is free, change its line there.
- Each specimen in `src/specimens/` recreates that app's real signature visual as inline SVG, generated at build time. Never import code or styles from another app's folder.
- No prices on this page. Prices live in each app's `products.json`.
- No PWA, no analytics, no third-party requests. Fonts are self-hosted (Fontsource).
- The page is served at `/`, its files under `/_landing/` (Vite `base`). The router forwards both; see `router/src/routes.ts`.
- Decisions and reasons: `DESIGN-NOTES.md`. Open questions for Roger: `DESIGN-TODO.md`.
