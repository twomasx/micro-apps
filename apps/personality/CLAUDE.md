# Experiment 01: Personality

Path `/personality/`. Site port 3001, functions port 8801. Run with `pnpm dev:personality`.

A 40-question test that gives you a four-letter type (like INTJ) with a percentage on each of the four axes. A compatibility checker compares two people. Free core, optional one-time paid reports.

Roger owns the design. On Oct 12, 2026 he approved the direction "Instrument" and asked Claude to build it, so this app is styled (the root rule about unstyled HTML no longer applies here). Logic still stays in modules, and every design choice Claude makes goes in `DESIGN-TODO.md` for Roger to confirm or change.

## Design: Instrument

- Off-white paper, near-black ink, hairline rules, one accent color. Clean and exact, like a measuring device giving a readout.
- Tokens are in `src/base.css` (`--paper`, `--ink`, `--ink-muted`, `--line`, `--accent`, `--radius`, `--font`). Use the tokens; never write a color or font in a screen file.
- The accent is for measured things only: progress, scales, focus rings, underlines. Main buttons are solid ink.
- Typeface: Inter Tight, self-hosted from `@fontsource-variable/inter-tight`, with tabular numbers. No outside font service.
- One stylesheet per screen in `src/styles/`. Phone layout first, then `min-width: 640px` and `min-width: 1024px`.
- Motion is short and has a job: 160 ms answer feedback, 220 ms question slide, 1.35 s result reveal. All of it is off under `prefers-reduced-motion`.
- No streaks, confetti, fake urgency or "almost there" nags.
- The paid report (step 6) uses a serif for long reading. That face is not chosen yet; ask Roger.
- Light only for now.

## The model

- Four-letter type system: E/I, S/N, T/F, J/P. 16 possible types.
- Never use the names "Myers-Briggs" or "MBTI" anywhere in the app, URLs, metadata or copy. The only exception is the footer line: "Not affiliated with The Myers-Briggs Company. Myers-Briggs and MBTI are trademarks of The Myers-Briggs Company."
- Don't use type nicknames from 16Personalities or any other test (no "Architect", "Mediator" and so on). The letter code is the name. Don't copy text from any other test.
- Each axis is measured with Big Five questions, because the four type scales line up with four Big Five traits (McCrae and Costa, 1989): E/I with Extraversion, S/N with Openness, T/F with Agreeableness, J/P with Conscientiousness.
- Questions come from the public-domain International Personality Item Pool (ipip.ori.org). The T and P poles use a few original questions, because the IPIP questions for those poles describe faults ("Insult people") instead of preferences. Every question's source is in the question file.

## Questions

- File: `src/data/items.p1.json`. Version `p1`. Don't edit questions in place. Any change to wording, order or scoring makes a new version file (`p2`), and old results keep their version.
- 40 questions, 10 per axis, 5 toward each pole. Fixed order (already interleaved in the file). Same order for everyone so results compare.
- 5-point scale: Very inaccurate (1) to Very accurate (5). Labels are in the file.
- Show the instructions line from the file before the first question.

## Scoring (put this in `src/lib/scoring.ts`, shared by client and server)

For each axis, using that axis's 10 answers:

1. Points toward the right pole (I, N, F, P): an item whose `pole` is the right letter scores its value (1 to 5). An item whose `pole` is the left letter (E, S, T, J) scores `6 - value`.
2. Add the 10 scores. The total runs from 10 to 50.
3. `rightPct = (total - 10) / 40 * 100`. `leftPct = 100 - rightPct`. Store both unrounded.
4. The letter is the side above 50%.
5. Tie at exactly 50%: count answers of 4 or 5 on each pole's own items; the higher count wins. Still tied: the left letter.
6. Balanced: if the winning side is 55% or less, label the axis "balanced, leans <letter>". The letter still goes in the type code.
7. Type code: the four letters in order EI, SN, TF, JP.
8. Display the winning side as a whole number: "68% Introversion".
9. All 40 answers are required before scoring.
10. If every answer is the same value, still score it, set the flag `same_answers`, and tell the user: "You gave the same answer to every question, so this result may not describe you."

Required unit tests (Vitest), at least these:
- All answers 3: every axis 50%, tie-break gives ESTJ, all four axes balanced.
- All answers 5: every axis 50% (because each axis has 5 questions per pole), ESTJ, `same_answers` flag set.
- Right-pole questions 5 and left-pole questions 1: 100% on I, N, F and P, type INFP.
- The reverse: 100% E, S, T, J, type ESTJ.
- An axis total of 32 (55%) is balanced; a total of 33 (57.5%) is not. With 10 questions, percentages move in steps of 2.5.
- Missing an answer throws.
- An answer outside 1 to 5 throws.

## Screens (routes under /personality/)

| Route | What it does |
| --- | --- |
| `/` | Intro: what the test is, about 6 minutes, free result, start button. Reads `?with=<resultId>` for the compare flow. |
| `/test` | The 40 questions. |
| `/r/:id` | The free result. Permanent link. |
| `/r/:id/report` | The full paid report, or the unlock offer if not paid. |
| `/c/:a/:b` | Comparison of two results. Couple report if paid. |
| `/science` | How the test works and where the questions come from, with sources. |
| `/privacy` | What we store and how to delete it. |

Functional rules for the test (layout and flow look are Roger's):
- Save progress to IndexedDB after every answer, key `personality:progress:p1`. Reloading resumes where you left off. Clear it after a successful submit.
- You can go back and change any answer. Going back never loses answers.
- Keys 1 to 5 answer on desktop. Each question is a proper radio group with labels. Move focus to the new question when it changes. Announce progress ("Question 12 of 40") to screen readers.
- The Android Back button goes to the previous question during the test, not off the page.

## Where client code lives

- `src/lib/`: plain TypeScript with no React. `router.ts` (URL to screen), `navigation.ts` (`navigate`, `appHref`), `progress.ts`, `store.ts` (IndexedDB), `api.ts`, `result-view.ts`.
- `src/hooks/`: `useTest` (the whole test flow), `useBackGuard` (Back button), `useResult`, `useRoute`, `useLoaded`.
- `src/pages/`: one thin component per screen. `src/components/Link.tsx` for in-app links.
- No router library. Add a screen by adding a case to `parseRoute` in `src/lib/router.ts` and to `Page` in `src/App.tsx`.
- The test asks one question per screen. A tap on an answer, or a key 1 to 5, saves it and moves on after 160 ms (`pick` in `TestPage.tsx`, `advanceFrom` in `useTest`). Arrow keys and Space only select; Enter or Next moves on. The last question never submits by itself.
- The question is a `role="radiogroup"` div, not a fieldset, because a fieldset will not stretch its content to put the answers at the bottom of the screen.
- The four progress lines show answered counts per axis (`axisProgress`), never which way the answers lean.
- The result reveal is driven by `useReveal` (one timer, values derived per frame). It is skipped when `matchMedia` is missing, which is why tests see final values at once.
- Back button: `useBackGuard` keeps one extra history entry while the test is open, so Back goes to the previous question, including after a reload.
- Screen tests (`src/*.test.tsx`) run in jsdom with `fake-indexeddb`. They need `vi.stubEnv('BASE_URL', '/personality/')` because Vitest serves from `/`.
- The report's charts are in `src/components/report/` (`ProfileChart`, `ScaleRuler`, `TraitBars`). They only draw: the numbers come from the report API, and the geometry (ruler ticks, profile line, part numbering, Big Five mapping) is in `src/lib/report-view.ts` and `src/lib/big-five.ts`.
- `src/lib/compare.ts` does the comparison (shared with the server). `swapSides` puts your own result first on the compare page.
- `/science` and `/privacy` render `content/science.md` and `content/privacy.md` through `InfoPage`. Those two files are imported into the client; no other content file may be.
- `DESIGN-TODO.md` lists every open design decision and the class names and `data-*` attributes for each screen. Update it when a screen changes.

## Free result

- Type code, the four axes with percentages and balanced labels, and a short summary for the type (about 80 words).
- Share button: Web Share API through `packages/platform`, falling back to copying the link.
- "Compare with someone" creates the link `/personality/?with=<id>`. Before sharing, say plainly: "The person you send this to will see your result."
- Save the user's result IDs in IndexedDB (`personality:results`) so the intro page can show "Your last result". Each entry also holds the `deleteToken`.
- A result taken on this device is "own": it shows the compare link and "Delete this result". Anyone else's result shows "Take the test yourself" instead.
- The intro saves the id from `?with=<id>` under `personality:compare-with`. Submitting the test reads it, clears it, and opens `/c/<with>/<new>` instead of the plain result. Opening the intro with no link and no test under way clears it.

## Paid products (prices in `config/products.json`)

| Product id | What it unlocks | Price |
| --- | --- | --- |
| `report` | The full report for one result | $9.99 |
| `couple` | The couple report for one pair of results | $7.99 |
| `both` | Both of the above | $14.99 |

- Full report: what each of your four percentages means, including what being near the middle means; the long type description (strengths, blind spots, at work, under stress, how others may read you); your scores described as the four Big Five traits they measure.
- Couple report: for each axis, whether you are alike or different and what that tends to mean day to day, plus questions to talk through together.
- Paid text is never in the client bundle. The server returns it only after it confirms the unlock. Anyone with a paid result link can read that report; that is fine, it makes sharing work.
- Checkout `success_url` returns to the report with `session_id`. If the webhook hasn't arrived yet, the page calls `verifyPurchase(sessionId)` so the unlock shows right away.

## Compatibility, honestly

- Compare axis by axis: both percentages side by side, alike or different.
- One summary number is allowed, labeled "How similar your answers are": `100 - average of the four absolute differences in rightPct`.
- Never call it a compatibility score or a match percentage. Research finds personality similarity only weakly predicts relationship satisfaction. Say that on the compare page in one plain sentence.

## API (Pages Functions in `functions/api/`)

| Method and path | Does |
| --- | --- |
| `POST /api/results` | Body `{ version, answers }`. Validates, scores on the server with the same scoring module, stores, returns `{ id, type, scores, flags, deleteToken }`. |
| `GET /api/results/:id` | Returns `{ id, version, type, scores, flags, createdAt, summary, unlocked }`. Never returns raw answers. |
| `GET /api/results/:id/report` | Full report text if unlocked, otherwise 402. |
| `DELETE /api/results/:id` | Needs the `deleteToken`. Deletes the result. |
| `GET /api/compare/:a/:b` | The comparison, plus couple report text if unlocked. |
| `POST /api/checkout` | Body `{ product, resultId, partnerResultId? }`. Returns the Stripe Checkout URL through `packages/payments`. |
| `POST /api/stripe/webhook` | Verifies the signature, records the purchase. Safe to receive twice. |
| `GET /api/health` | `{ "ok": true }` |

- The client keeps `deleteToken` in IndexedDB. The server stores only its hash (SHA-256).
- Result IDs: random, 16 characters from lowercase letters and digits (no `l`, `o`, `0`, `1`). See `server/ids.ts`.
- `DELETE` takes the token as `Authorization: Bearer <deleteToken>`. 401 without a token, 403 with the wrong one, 204 when deleted.
- `answers` is an object from question id to value: `{ "p1-01": 4, ... }`. `scores` is an array of four `{ axis, letter, leftPct, rightPct, balanced }` in type code order.
- Errors are `{ error: "<code>", message }` with a 4xx status. Every API response sends `Cache-Control: no-store`.
- `unlocked` is true when `purchases` has a row for the result with product `report` or `both` and status `paid`.
- `summary` is the Summary section of the type's content file.
- `POST /api/checkout` stores a `pending` row in `purchases` with the Stripe session id. Only two things turn it into `paid`: the webhook, or `GET /api/results/:id/report?session_id=...` when the buyer returns first. Both ask Stripe whether the session is paid, and only a session we created for that result can unlock it.
- `couple` and `both` need `partnerResultId` and are sold on the compare page. For `both`, `resultId` is the buyer's own result: that one gets the full report. A paid pair is unlocked whichever way round the two ids are given.
- `GET /api/compare/:a/:b` takes `?session_id=` the same way the report does. It answers 400 for the same id twice, 404 when either result is missing, 409 when the two results come from different question versions.
- The report page fetches the result first and only asks for the report when it is unlocked or a `session_id` is present, so a locked report does not log a failed request.
- `PUBLIC_ORIGIN` (in `.env`) is where Checkout sends the buyer back. Without it the functions use the request origin, which is wrong behind the Vite proxy.

## Where server code lives

- Route files in `functions/api/` stay one-liners. Pages turns every file under `functions/` into a route, so the logic and its tests live in `server/` (`server/results.ts`, `server/payments.ts`, `server/compare.ts`, `server/content.ts`, `server/ids.ts`, `server/http.ts`).
- Payment handlers take a `PaymentsFactory`, so tests pass a fake provider and never call Stripe.
- Pages Functions cannot import `.md` files. `pnpm --filter @micro/personality content` writes `server/content.generated.ts` from `content/`. Run it after every content edit; a test fails when it is out of date. Only `server/` may import that file, because it holds the paid text.
- `src/lib/scoring.ts` and `src/lib/questions.ts` are shared by client and server. Keep DOM and Workers APIs out of them. `getQuestions(version)` returns the question file for a version.
- API tests (`server/*.test.ts`) run the handlers against an in-memory local D1 from `createTestDb()` in `server/testing.ts`. Add each new migration file to the list in that file.

## Database (D1, migrations in `migrations/`)

- `results`: id, version, answers (JSON), scores (JSON), type, flags (JSON), delete_token_hash, created_at.
- `purchases`: id, stripe_session_id (unique), product, result_id, partner_result_id (nullable), amount_cents, currency, status, created_at.
- Store raw answers. We need them later to check reliability and to rescore if the model changes.
- Use local D1 for development. Run `pnpm --filter @micro/personality db:migrate` once after cloning and after adding a migration. The data is a SQLite file under `apps/personality/.wrangler/` (not in git).
- `purchases` has no foreign key to `results`, so a purchase record stays when a result is deleted.

## Content

- Lives in `content/` as Markdown, not in components: `types/<CODE>.md` (free summary plus paid sections), `axes/<EI|SN|TF|JP>.md`, `pairs/<EI|SN|TF|JP>.md`, `science.md`, `privacy.md`.
- Every file starts with `status: draft`. Roger reviews and changes it to `status: approved`.
- File format: the `status:` line, one `# title`, then `## sections`. `parseContent` in `src/lib/content.ts` reads it. `src/content.test.ts` checks that all 26 files exist, have their sections and use no banned wording.
- The server serves the files whatever their status. Before launch every file should say `approved`.
- Describe preferences, not abilities. No claims about intelligence, success, income or which careers someone "should" have. Every type gets equally respectful framing.
- No Barnum statements that fit everyone ("You sometimes doubt yourself"). Each sentence should be truer of this type than of its opposite.
- Follow the writing rules in the root CLAUDE.md.

## Science page must say

- The questions measure four Big Five traits and report them as type letters.
- Most people score near the middle on at least one axis. That is why the test shows percentages and labels the middle as balanced.
- Type tests are less stable than trait scores: people near 50% can get a different letter on a retest. Their percentages barely move.
- Where the questions come from (IPIP, public domain) and which ones are original.
- It is not a clinical or hiring tool.

## Build order

1. Scoring module and its tests. **Stop and show Roger the test results.**
2. D1 migration and the results API, with tests.
3. The test flow, with progress saving and submit.
4. The free result page and share.
5. Content drafts for all 16 types, the axes, the pairs, science and privacy. **Stop and tell Roger they are ready to review.**
6. Payments: checkout, webhook, verify, the paid report.
7. The compare flow and couple report.
8. Root "Done means" checks, plus `DESIGN-TODO.md`.

Commit after each step.

## Testing payments locally

- `apps/personality/.env` needs `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and `PUBLIC_ORIGIN=http://localhost:3001`. Restart `pnpm dev:personality` after changing it.
- Webhooks: `stripe listen --events checkout.session.completed --forward-to http://127.0.0.1:8801/api/stripe/webhook` (Stripe CLI is in `~/.local/bin`). The `whsec_` value it prints goes in `.env`.
- Test card: 4242 4242 4242 4242, any future date, any CVC. Untick "Save my information with Link" or Stripe asks for a phone number.

## Deploy

- Hosting: Cloudflare Pages project `micro-personality` (https://micro-personality.pages.dev), production branch `main`. The router Worker forwards `polymadlabs.com/personality/*` to it with the `/personality` prefix removed.
- Deploy from `apps/personality`: `pnpm build`, then `pnpm exec wrangler pages deploy dist --project-name micro-personality --branch main`. A push to GitHub does not deploy.
- Database: D1 `micro-personality`, id in `wrangler.jsonc`. After adding a migration: `pnpm exec wrangler d1 migrations apply DB --remote`. Local dev uses its own file, kept under `preview_database_id`.
- Secrets live in the Pages project, set with `pnpm exec wrangler pages secret put <NAME> --project-name micro-personality`: `STRIPE_SECRET_KEY` (test mode), `STRIPE_WEBHOOK_SECRET`, `PUBLIC_ORIGIN` (`https://polymadlabs.com`). A changed secret needs a new deploy.
- The router is in `router/`. `pnpm exec wrangler deploy --env preview` puts it on a workers.dev address with no domain. `pnpm exec wrangler deploy` is production and attaches `polymadlabs.com` and `www`. Add an app to `LIVE_APPS` in `router/wrangler.jsonc` when it is deployed; until then its path says "Coming soon".

## Later (not this week)

- Script to compute Cronbach's alpha per axis from stored answers. Target 0.70 or higher once there are a few hundred results.
- Per-result share images and Open Graph tags.
- Results and sales in our own admin dashboard.
- Clear out old `pending` purchase rows. Every press of "Unlock" that is not paid leaves one.
