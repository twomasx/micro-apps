# Intention: design notes

What was decided, and why. Open questions and device checks for Roger are in `DESIGN-TODO.md`.

## The run protocol

- **One streamed response per run.** Roger chose Server-Sent Events over polling on 2026-10-15 (80 requests a run was too many). The server sends a batch every 250 ms, writes D1 once at the start and once at the end, and saves a partial run if the connection drops.
- **A dropped connection needs `enable_request_signal`.** Without it, local workerd never told the function the browser had gone: a run stopped after 3 s kept streaming into nothing and was saved as complete with 4,000 bits. With the flag, `request.signal` aborts and the run is saved as abandoned with the bits it had (checked directly on wrangler and through the Vite proxy). Production through the router Worker is checked at deploy.
- **Abandoned runs are scored over their planned length.** z = deviation toward the aim ÷ √(planned bits). For complete runs this is the spec formula. Dividing by the bits so far would let someone stop whenever they are ahead: in a 10,000-run simulation of exactly that, the combined score came out +43.6 from pure chance. Over the planned length it stays at +0.5 (average +0.005).
- **The screen runs about 250 ms behind the server.** Each batch is played back bit by bit at 200 a second (`src/lib/playback.ts`), so the seam moves smoothly while always showing a real prefix of the bits.

Simulation, 10,000 runs of 4,000 bits through the server's bit maker and the real scoring: 48.96% positive, 49.84% negative, 1.20% exactly even, average z −0.0033, SD 0.9989, 4.74% above +1.65 and 4.93% below −1.65.

## The tug screen

### The field

- **Two colors edge to edge, drawn on one canvas.** The left color of the pair is on the left. 1 bits favor the right color.
- **The seam comes straight from the score.** Position = 0.5 − (score ÷ 3) × 0.4 of the width, clamped at ±3, using the raw lean of the bits shown (deviation ÷ √bits). At the clamp the losing color still has 10% of the screen.
- **An 80 ms lag on the seam, nothing more.** The first few bits can move the raw score a long way (one bit is ±1.0), which made the seam jerk. A first-order lag of 80 ms, the same in every direction and at every point of the run, softens that without overshoot, and the seam settles on the true position within a few frames. Tried with no lag first: honest but twitchy in the first half second. The reference sketch used about 450 ms, which visibly trails the numbers, so it was rejected under the honest-motion rule.
- **The seam lives.** A slow sideways wave (three sine terms, at most 4.6% of the width) keeps it organic. It is decoration, identical on every run, and does not depend on the bits. Reduced motion freezes it.
- **Winning and losing are symmetric.** Whichever color the bits favor brightens slightly (8%) and glows from the middle of its side, in proportion to the score. The other color darkens (up to 30%) and loses up to half its saturation. It does not matter whose color it is: if the bits favor the other color, yours dims. Pulling, winning and the arrow always agree (`src/lib/tug.test.ts`).
- **Your side carries a steady glow along the seam,** in a pale version of your color. It never pulses, so it cannot be read as a result. With the arrow in the pill it is the only direction cue. Nothing on the seam looks like a handle.
- **Specks.** One per bit, from the seam into the side the bit favors. Each lives 1.2 s, rises and fades along a sine curve, so nothing pops. First version: hard 1.9-unit dots at 60% opacity. On screen they read as a rain of dots, louder still on desktop. Now a faint core (42%) inside a soft halo (7%), with size capped for big screens. Reduced motion: no specks.
- **No canvas blur filters.** `ctx.filter` is missing in iPhone Safari and costly on mid-range Android. Soft light comes from layered strokes and gradients.
- **Canvas size is capped** at 2x pixel density and about 1.6 million pixels. A phone at 2x is about 1.2 million, so phones are unaffected. Desktop at 1280 × 800 fell to 47 fps in headless software rendering at full 2x. With the cap it holds 60 fps at all three widths.

### Text and controls

- **Night style only:** white text, white Begin button with dark text, and dark shading at the top and bottom edges, worked out per pair (see "Colors" below).
- **Fonts:** Unbounded 300 for the headline and score, Inter Tight 400, 500 and 600 for the rest. Self-hosted Latin subsets from Fontsource.
- **The headline before the first run says "Pull your color across".** Your color does not exist until the server picks it. When the run starts, the headline names it ("Pull Glacier across") for 1.6 s, then fades out. After that the only thing at the top is the progress ring.
- **The progress ring fills with the bits shown,** not with a timer, so it ends exactly when the last bit appears. A finished run draws a check mark inside it. A stopped run keeps its partial ring and gets no check.
- **The pill names your color with an arrow** for the way your color travels ("Your color: Glacier ←"). Screen readers hear "which travels left" instead of the arrow.
- **The score is big and thin, with "how far from chance" under it.** During a run it is the live score. At the end it is the recorded score. For a stopped run it is the recorded score over the planned length, which the line explains.
- **A quiet Stop button during the run.** The reference hid the button, which left closing the app as the only way to stop. Stopping is allowed and the run still counts, so there is an outlined, transparent "Stop" in the button's place. It keeps the layout from jumping. The color dot hides during a run.
- **Wording.** Before: "You get one of the two colors at random. For 20 seconds, try to make it spread across the screen." During: "Hold Glacier in mind and will it across." It asks you to try without saying it works. After: the one-run verdict at its real odds.
- **One short vibration (15 ms) at the end of every run, the same for any score.** A stronger buzz for a high score would reward a result that is most likely chance. No vibration on iPhone, where the API is missing.
- **The screen stays on during a run** (Screen Wake Lock, released at the end).

## Colors

### Readable on any pair

- **The text stays white and the button stays white.** That is the Night style. What changes per pair is how dark the top and bottom edge shading is (`src/lib/readability.ts`).
- **The shading is worked out against the brightest each color can get on screen:** the winner's lightening, its glow and the pale band along the seam, all stacked. So the text holds wherever the seam is and whoever is winning.
- **Targets:** WCAG AA. 4.5:1 for the line of text, the "how far from chance" caption (white at 84%) and the Stop button text. 3:1 for the headline (large text) and the progress ring (a control). The white Begin button gets the same 4.5:1 against its background, so it stands out at more than the 3:1 a control needs.
- **The shading hangs off the text blocks,** not off fixed screen percentages. Every line of text sits on the full amount at any screen size, and the shading eases out over 96 px above it. Each pair gets the least shading that passes, never less than 0.30 at the top and 0.45 at the bottom, so all pairs keep the same Night look.
- **Tested on every preset and on 425 custom pairs,** including white with white, and black, yellow, cyan and green in every combination.

| Pair | Top | Bottom | Weakest text contrast |
| --- | --- | --- | --- |
| Ember and Glacier | 0.37 | 0.60 | 4.87:1 |
| Rose and Navy | 0.30 | 0.52 | 4.81:1 |
| Saffron and Indigo | 0.37 | 0.60 | 4.88:1 |
| Peach and Lilac | 0.35 | 0.59 | 4.86:1 |
| Chartreuse and Magenta | 0.41 | 0.62 | 4.90:1 |
| Day and Night | 0.46 | 0.66 | 4.93:1 |
| Tangerine and Plum | 0.30 | 0.57 | 4.85:1 |

The default pair's automatic values (0.37 and 0.60) land almost exactly on the sketch's hand-tuned Night style (0.38 and 0.58).

### Colorblind check of the presets

Each pair is simulated for protanopia and deuteranopia with the Machado, Oliveira and Fernandes (2009) matrices at full severity, then compared in Oklab. About 0.02 is a just-noticeable difference. The test requires 0.10, a clear difference at a glance. Every preset passes; the closest is Ember and Glacier under deuteranopia, at more than twice the line.

| Pair | Typical | Protanopia | Deuteranopia |
| --- | --- | --- | --- |
| Ember and Glacier | 0.289 | 0.272 | 0.212 |
| Rose and Navy | 0.381 | 0.239 | 0.361 |
| Saffron and Indigo | 0.499 | 0.452 | 0.509 |
| Peach and Lilac | 0.236 | 0.219 | 0.249 |
| Chartreuse and Magenta | 0.420 | 0.414 | 0.304 |
| Day and Night | 0.728 | 0.727 | 0.730 |
| Tangerine and Plum | 0.425 | 0.387 | 0.442 |

Color is never the only cue: the pill names your color and the arrow shows its direction.

### The color fan

- **Swatches fan out from the dot in a quarter arc,** each a half-and-half circle of its pair, with a slight bounce (an overshooting curve) and a 26 ms stagger. They fold back in reverse order, faster and without bounce. Everything behind fades to 12% and a dark wash rises from the corner. The dot turns half a turn while the fan is open.
- **The arc starts at 195°, not straight left.** At 180° the first swatch sat on the Begin button's row.
- **The radius fits the screen.** It is measured when the fan opens, from the room left of the dot. On a 360 px Android phone the fan still has full 48 px swatches, 9 px from the edge. Only below about 340 px do swatches shrink, never under 44 px.
- **The current pair's name shows just above the dot,** inside the arc, where nothing else sits.
- **Picking a pair applies it, holds 220 ms so you see it selected, then folds.** The choice is saved on the device (`intention:colors`).
- **Closing:** tapping outside, Escape (focus goes back to the dot) and the Android Back button. The rest of the screen is inert while the fan is open, so keyboard focus stays in it.
- **No fan during a run.** The dot is hidden; colors cannot change while bits count.

### Your own colors

- **The "+" swatch opens a sheet with two color wells,** left and right. The field behind updates as you pick, and the sheet's dimming is light so you can see it. "Use these" keeps the pair; Close or Back puts the old one back.
- **Custom colors get plain names** ("Red", "Deep blue", "Pale pink"), from the nearest of twelve familiar hues in Oklch, so the pill can still say "Your color: Teal". If both names come out the same, they become "Light blue" and "Dark blue"; two identical colors become "Left color" and "Right color".
- **Notes, never blocks.** If the two colors are hard to tell apart for anyone, or for red-green color blindness, the sheet says so in one line. The screen stays readable either way.
- **Lab Pass:** the spec puts your own colors in Lab Pass. The lock and price on "+" come with payments in step 6.

## Intention Hour

- **Time:** `config/intention-hour.json`, 9:00 pm in the America/Los_Angeles zone for 10 minutes. It stays 9:00 pm on Pacific clocks across daylight saving (tested on the change days).
- **Tagging:** the server tags a run with the event's date ("2026-10-15") when the run starts inside the window, using the server's clock. A run started at 9:09:59 counts; one at 9:10:00 does not.
- **Home screen:** a single line under the headline. In the last 3 hours: "Intention Hour starts in 42 min." While live: "Intention Hour is live. 6 min 30 s left." Otherwise nothing, so the screen stays quiet most of the day. Hidden during a run.
- **Your own time** is shown next to "9:00 pm Pacific" only when it differs ("9:00 pm Pacific (12:00 am your time)").
- **Add to calendar** downloads `intention-hour.ics`: a daily repeating 10-minute event at 21:00 in the Los Angeles zone, with that zone's daylight saving rules included, so every calendar app shows it at the right local time. It is on the global page and in the menu. No push notifications.
- **Its own result** on the global page: all Intention Hours combined (Stouffer), then the last 14 one by one with how many runs, how many people and the score. Cached for 1 minute instead of 5, because the event lasts only 10.

## The global page

- **Night style like the app:** the same dark ground, white text, Unbounded for the title and numbers, Inter Tight for the rest. The chart is white on night, so it reads the same whatever pair you use.
- **The chart** is the running deviation toward each run's own aim over every bit ever made, so it is comparable across both colors. The two shaded bands are where chance keeps it 19 times in 20 (±1.96 √bits) and 99 times in 100 (±2.576 √bits). Two-sided on purpose: a line far below the bands (psi-missing) is as interesting as one far above. The key under the chart names both.
- **The sentence under the chart** says where the line is at the strength chance allows: inside the shaded area, between the bands ("worth watching, not a finding"), or outside both ("what matters is whether it stays out").
- **Totals:** runs, people (explained as devices with a random id), bits, the combined score in big type with the total's wording, and the share stopped early, with "They still count."
- **Splits** by Intention Hour versus any other time, and by random source, as lists rather than wide tables, so they read on a phone. A by-exercise split appears once there is more than one kind.
- **Runs in progress** wait until they end and are mentioned in one line.
- **Cache:** 5 minutes (`Cache-Control: public, max-age=300`). The chart sends at most 600 points, thinned evenly, always keeping the first and last.
- **Scale:** the totals read every run row on each refresh. That is fine for tens of thousands of runs at one query per 5 minutes. Past that, keep running totals in their own table.

## The menu

A round three-line button at the top right, shown whenever no run is in progress. During a run the corner holds only the progress ring, as the spec asks. After a run, the ring with its check sits beside the menu button. The menu is a sheet with the other pages and Intention Hour's time and calendar button. Links in it replace the sheet's history entry, so Back from a page returns to the tug.

## Your runs

- **Found by the device's random id,** sent in a header (`X-Device-Id`), not in the address, so it stays out of logs and browser history.
- **Free:** your last 5 runs, newest first, and how many you have in all ("Your last 5 of 23 runs."). **Lab Pass:** every run, your lifetime total (Stouffer) in big type with the total's wording, your own running chart (the global chart's design, with your bits only) and a CSV of every run with every bit. The server decides which, from the unlock code (`X-Unlock-Code`) checked against paid purchases.
- **Each run shows** when it started in your own time, its score, which side your color was on, and whether it was stopped early, longer than 20 s or during Intention Hour. The color names are not stored with a run (the pair can change), so the list says "Your color was on the right".
- **"Every bit of this run"** links to the run's raw record on the server. It is plain data, which is the point: nothing is hidden.
- **Runs in progress** join the list when they end.

## The science and privacy pages

- **The science page stays inside the spec's claims:** PEAR reported very small effects, the three-lab replication did not confirm them, and the 380-study meta-analysis found an extremely small effect that publication bias could explain. Both published replies to the meta-analysis are listed, one on each side. The stance in the lead: "Nobody has proven it. Nobody has proven it impossible either."
- **Numbers are exact and labeled:** 68% of runs within ±1, 1 in 20 above +1.65, psi-missing at −1.96 (about 1 time in 40), the stop-when-ahead simulation's average (0.005), and what it would take to see an effect of one bit in ten thousand (about 25,000 runs to be expected at the edge of the inner band). That last one is plain arithmetic: 0.0002 × √bits = 1.96.
- **The random source** is named the way the spec asks, "cryptographic random numbers generated on our server". The page adds "They are not quantum random numbers", because people may assume they are. No other use of "quantum".
- **Privacy** follows the other apps' structure: on this device, on our server, payments, what we don't do. It says plainly that runs cannot be removed from the totals, and why.
- **A content test** checks the science page, the privacy page and every line the tug screen can say for the writing rules (no em dashes, no exclamation marks) and the banned claims.

## Lab Pass

- **One product,** `labpass`, $4.99 (499 cents) in `config/products.json`. Every price on screen reads "$4.99 once. No renewals."
- **Checkout, webhook, unlock codes and restore** are attention's, through `packages/payments`, with the product renamed. The server alone decides: the webhook (signature checked) or a direct question to Stripe marks a purchase paid, and every request Lab Pass changes (longer runs, no daily limit, full history, CSV) carries the code and is checked again on the server.
- **Free runs: 5 a day,** counted on the server per device from midnight in the device's own time zone (sent with each run; an unknown zone counts in UTC). Every started run counts toward it, stopped or not, the same rule as the totals. The sixth run's line says so with the price, and the button becomes "See Lab Pass". Clearing the browser's data gives a new device id and so a fresh 5. That is acceptable for a soft limit with no accounts.
- **Locked items show what they do and the price:** the "+" swatch opens a sheet that says "Use any two colors you like" with the price and a link; the 60 and 120 second options in the menu are visible but disabled, with the price under them; your runs page shows the last 5 with what Lab Pass adds. No countdowns, no nagging, no pre-ticked anything.
- **Run length lives in the menu,** as three plain choices (20 s, 60 s, 120 s), saved on the device. The line before a run says the chosen length.
- **Losing Lab Pass** (a refund, or a code that stops checking out) quietly returns to the free view: a saved custom pair shows as Ember and Glacier, and runs are 20 seconds.
- **Tested end to end in Stripe test mode:** 5 free runs, the sixth refused with the offer, checkout with the 4242 test card, the code shown on return, 60-second runs, the custom picker, the full history and the CSV, and restoring the code on a second device.

## Done checks (step 7, Oct 15, 2026)

Run on the production build (`pnpm build` + `vite preview`, service worker on) with the local functions.

- `pnpm typecheck`, `pnpm test` (204 intention tests, every workspace passing), `pnpm lint` and `pnpm build` pass.
- Every page (the tug, everyone's runs, your runs, the science, privacy, Lab Pass, restore, not found) at 375, 768 and 1280 px: no console errors, no sideways scroll, the service worker registered with scope `/intention/`.
- Touch targets: every button and link outside running text is at least 44 px. (The fan swatches measure 14 px while folded, when they are invisible and inert; open they are 48 px.)
- A full 20-second run: 20.4 s from tap to result (20 s of bits plus the 250 ms playback delay and the network), 60 fps, the ring drew its check.
- Largest paint 0.6 s on the main screen and on everyone's runs, with 4G throttling (9 Mbps, 170 ms) and a 4x slower CPU. Budget 2.5 s.
- JavaScript: 91.8 KB gzipped for the page. Budget 150 KB. The service worker's own files (6.2 KB) load separately.
- Stripe test mode end to end: checkout with the 4242 card, the code on return, restore on a second device, 60-second runs, your own colors, full history and the CSV.

### Icon

A dark square with a circle split by a curved seam: Ember on the left, Glacier on the right, a thin white line between. The circle sits inside the middle 80%, so the 512 px file is also the maskable icon.
