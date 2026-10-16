# Experiment 05: Intention

Path `/intention/`. Site port 3005, functions port 8805. Run with `pnpm dev:intention`.

Can your mind move a random number? This app lets anyone test it under strict rules. Two colors fill the screen in a tug of war. You get one of them at random. For 20 seconds, random bits from the server pull the line toward one color or the other, and you try to make yours spread across the phone. Every run is logged, nothing is hidden, and everyone's runs add up to one global result.

## The science (the app must stay inside this)

- Princeton's PEAR lab (Jahn and Dunne, 1979 to 2007) reported very small effects of intention on random number generators.
- A three-lab replication (Jahn and others, 2000) did not confirm them.
- A meta-analysis of 380 studies (Bösch, Steinkamp and Boller, 2006, *Psychological Bulletin*) found an extremely small overall effect that publication bias could explain.
- So nobody has shown this convincingly. The app's stance: "Nobody has proven this. Test it yourself, under rules that make cheating impossible." Never claim the effect is real, and never claim it is impossible.
- Results consistently below chance are called psi-missing in this research. Treat them as just as interesting as results above chance, and label them that way.

## Design: Claude designs this one

As with the other apps since focus, Roger picked the direction and wants Claude to design and style it. The root CLAUDE.md rule "Roger owns design, no CSS" does not apply to the intention app. Roger reviews the design on his phone before anything else is built on it.

**Direction: Tug.** Open `design/tug-reference.html` in a browser. It is a working sketch. Copy the idea, not the code, and make it better. The "Design lab" panel under the phone is Roger's tool for comparing styles. It is not part of the app.

What makes this design work, keep all of it:

- **Almost the whole screen is color.** Two colors fill the phone edge to edge, split by a living, softly glowing seam. Text and controls are minimal and sit at the bottom.
- **You get a color, not a side.** The headline says "Pull Glacier across" (with the real color name). A single pill says "Your color: Glacier ←".
- **The line moves the way your color travels.** When the bits favor your color, your color spreads across the screen and glows, and the other color dims and loses some saturation. Pulling, seeing your color win and the arrow direction always agree.
- **Direction cues stay quiet:** a soft glow on your color's side of the seam, plus the small arrow in the pill. No tabs, handles, chevrons on the seam or anything that looks draggable.
- **Each random bit sends a faint speck of light** from the seam into the side it favors.
- **Top of the screen:** the headline shows only before a run, then fades out. During a run the only thing at the top is a small progress ring that fills over the run. When the run ends the ring draws itself into a check mark. No "done" text, no timer text.
- **Bottom:** your color pill, the score (big, thin type) with "how far from chance" under it, one line of text, and the Begin button with a round half-and-half color dot next to it. Before a run, the pill and score are hidden.
- **Night style only:** white text, white button with dark text, dark shading at the top and bottom edges so text reads on any color.
- **Fonts:** Unbounded (light weight) for the headline and score, Inter Tight for everything else. Self-host Latin subsets.

**The color fan (hidden palette).** Tapping the color dot fans the color pairs out in an arc, like a paint swatch fan deck, with a slight bounce, while everything behind them fades. The current pair's name shows by the dot. Tapping a pair applies it and folds the fan back. The last swatch, "+", opens a picker for any two colors. Tapping outside, Escape and the Android Back button close the fan.

**Preset pairs** (left color first): Ember and Glacier `#f2683c` / `#7fc8e8` (default), Rose and Navy `#e85d8a` / `#25366a`, Saffron and Indigo `#f3b53b` / `#3d3aa6`, Peach and Lilac `#f7a07a` / `#a68bf6`, Chartreuse and Magenta `#c3dd47` / `#cf3f95`, Day and Night `#f1efe9` / `#1b1b1f`, Tangerine and Plum `#ff8a3d` / `#5b2a6e`.

**Rules that must hold:**

1. **Direction consistency.** If the bits favor your color, your color grows, the seam moves the way your arrow points and the score is positive. Always. Write tests for both colors and both directions.
2. **Honest motion.** The seam position comes directly from the current score (clamped at about plus or minus 3). No exaggeration, no easing tricks at the end, no animation that suggests a result the numbers don't have.
3. **Readable on any colors.** Pick text and button colors automatically from the colors behind them so contrast stays at WCAG AA, including custom pairs.
4. **Colorblind-safe.** Check every preset pair for red-green color blindness. Never rely on color alone: the pill always names your color.
5. **No flashing.** Specks and glow move smoothly. Respect `prefers-reduced-motion`: the seam still moves (it is the result), everything else holds still.
6. **No duplicate or control visuals.** No small twin orbs, mini previews or "chance" copies on screen. Roger does not want them in this or future designs.

Note design decisions and alternatives you tried in `DESIGN-NOTES.md`.

## The run protocol

**Randomness comes from the server, never the client.**

1. The user taps Begin. The client asks the server to start a run.
2. The server creates the run, picks the aim (left or right color) at random, fixes the length, and records the start time. The client never chooses the aim or the bits.
3. The run is one streamed response (Server-Sent Events), not polling. Every 250 ms the server generates the bits the clock allows since the start (no batches made in advance), with `crypto.getRandomValues`, timestamps them and sends them. The run is written to D1 at the start and once at the end. If the connection drops (`request.signal`, which needs the `enable_request_signal` compatibility flag), the bits so far are saved and the run is abandoned. The client plays each batch back bit by bit at 200 a second.
4. The server never hands out bits faster than real time, so a 20-second run always takes 20 seconds.
5. Standard run: 20 seconds at 200 bits a second, 4,000 bits. Store all the raw bits (about 500 bytes a run).
6. **Every started run counts.** Stopping early never removes a run. An abandoned run is saved with the bits it had and counts in every total. Show the abandonment rate on the global page.
7. Each run records its random source: `crypto` now, `quantum` later. Totals can be split by source.

**Scoring**

- Each bit is +1 (a 1) or −1 (a 0). The running total is the deviation.
- Run score: z = deviation × aim ÷ √(planned length in bits), so positive always means "toward your color". 1 bits favor the right-hand color. For a complete run this is deviation ÷ √(bits). Dividing an abandoned run by its planned length, not the bits it got, means stopping when ahead cannot lift the totals (see `src/lib/scoring.ts` and the stop-when-ahead simulation). The live score on screen uses the bits so far.
- "1 in X by chance": one-sided, from the normal distribution. Copy: "About 1 in 6 runs pull this far toward Glacier by chance. Normal." Above 1 in 20: "Interesting, but one run proves nothing."
- Combining runs (your lifetime total, the global total, Intention Hour totals): Stouffer's method, the sum of the z scores divided by the square root of the number of runs.
- Lifetime total wording: "After 40 runs your total is −0.80: within chance." At or below −1.96: "Below chance, which researchers call psi-missing. Chance alone does this about 1 time in 40." At or above +1.96: the same, mirrored.

**Required tests (Vitest)**

- Direction consistency for both colors in both directions.
- z, one-sided p and Stouffer combination against known values.
- A simulation of 10,000 runs through the real scoring code: about 50% positive, average near 0, about 5% above +1.65 (within normal tolerance). Show Roger the numbers.
- The server refuses batches faster than real time, refuses a client-chosen aim, and keeps abandoned runs.

## Intention Hour

- Everyone runs at the same time, once a day, for 10 minutes. The time lives in `config/intention-hour.json` (start with 9:00 pm Pacific).
- The home screen shows a countdown when it is coming up and "Intention Hour is live" while it runs.
- Runs during the window are tagged and get their own combined result on the global page: how many people joined, how many runs, the combined score.
- An "Add to calendar" button that downloads a small `.ics` file for the daily event. No push notifications for now.

## Global results page

- One chart of every run ever, combined: the running deviation over all bits, with the curves where chance usually stays (1 in 20 and 1 in 100). Night style, same colors and type as the app.
- Totals: runs, people (anonymous devices), bits, the combined score, the share of abandoned runs.
- Split by random source and by Intention Hour versus any time.
- Plain wording: "If intention moved the numbers, this line would leave the shaded area and stay out."
- Cache the numbers for 5 minutes.

## Free and Lab Pass

Price lives in `config/products.json`: one product, `labpass`, $4.99 (499 cents). The copy says "$4.99 once. No renewals."

| Free | Lab Pass |
| --- | --- |
| 5 runs a day | Unlimited runs |
| The preset color pairs | Your own two colors (the "+" picker) |
| Intention Hour and the global page | Your full history: every run, your lifetime total and your own running chart |
| Your last 5 runs | Longer runs: 60 and 120 seconds |
| | Download your data as CSV |

- Locked items show what they do and the price. No dark patterns.
- Unlock code, restore and checkout exactly as in the other apps, through `packages/payments`.

## Screens (routes under /intention/)

| Route | What it does |
| --- | --- |
| `/` | The tug of war. Intention Hour countdown when relevant. |
| `/global` | The global results page. |
| `/me` | Your runs and lifetime total (last 5 free, everything with Lab Pass). |
| `/unlock` | What Lab Pass adds, the price, the buy button. Stripe returns here. |
| `/restore` | Enter an unlock code. |
| `/science` | The research history, how a run works, why the server makes the bits, how scores are calculated, psi-missing, the random source. |
| `/privacy` | What is stored. |

## API and data

- `POST /api/runs` with `{ deviceId, kind, seconds? }`: starts a run and answers with one `text/event-stream`: `start` `{ runId, aim, lengthBits, source, bitsPerSecond }`, then `bits` `{ bits, n, deviation }` about every 250 ms, then `end` `{ status, n, deviation, z }`. A body with an `aim` is refused. Closing the connection stops the run early (it still counts). A row still `running` 30 s past its planned end counts as abandoned. Shapes live in `src/lib/protocol.ts`.
- `GET /api/runs/:id`: a run's result.
- `GET /api/global`, `GET /api/hour`: totals, cached.
- Payment routes as in the other apps.
- D1 tables: `runs` (id, device_id, created_at, kind, aim, source, length_bits, n, deviation, z, status, hour_event, bits, batch_times) and `purchases`. `kind` is `tug` for now.
- **Built to grow.** Roger plans to add more exercises later. Keep the run protocol, scoring and totals independent of the tug screen, so a new exercise is a new screen plus a new `kind` value, not a rewrite. The global page and lifetime totals work per kind and across all kinds.
- Device ID: a random ID created on the device and stored in IndexedDB (`intention:` prefix). No names, emails or IP addresses stored.

## Honest claims

- Never: "prove your psychic powers", "quantum manifestation", "your mind controls reality" or any claim that the effect exists.
- The random source is labeled truthfully. Today it is "cryptographic random numbers generated on our server", not quantum. Don't use the word quantum for it.

## Build order

1. The run protocol on the server, scoring, and all required tests, with a bare page that runs a real 20-second trial against the local functions. **Stop: show Roger the simulation numbers and the direction tests.**
2. The Tug screen in Night style: seam, glow, specks, direction cues, progress ring and check, pill, score. **Stop so Roger can review it on his phone.** Iterate with him here.
3. The color fan, the custom picker, automatic contrast, the colorblind check of the presets.
4. Intention Hour and the global results page.
5. Your runs page, science and privacy content.
6. Lab Pass and payments.
7. Root "Done means" checks.
8. Deploy following DEPLOY.md (new Pages project, D1, secrets, add intention to the router's live apps, Stripe webhook). Add intention to the home page.

Commit after each step.

## Later (not this week)

- A quantum random source (for example ANU's quantum random numbers, now offered through AWS) behind a config switch, once cost and rate limits are checked. Runs keep their source, so results can be compared.
- An eyes-closed sound mode: bits as soft clicks in the left or right ear.
- Intention Hour reminders.
- More exercises on the same protocol, each its own `kind` (for example, a precognition exercise where the server picks the target after you guess).
