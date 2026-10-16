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

- **Night style only:** white text, white Begin button with dark text, dark shading at the top (38%) and bottom (60%) edges. Step 3 makes the shading automatic per pair for WCAG AA.
- **Fonts:** Unbounded 300 for the headline and score, Inter Tight 400, 500 and 600 for the rest. Self-hosted Latin subsets from Fontsource.
- **The headline before the first run says "Pull your color across".** Your color does not exist until the server picks it. When the run starts, the headline names it ("Pull Glacier across") for 1.6 s, then fades out. After that the only thing at the top is the progress ring.
- **The progress ring fills with the bits shown,** not with a timer, so it ends exactly when the last bit appears. A finished run draws a check mark inside it. A stopped run keeps its partial ring and gets no check.
- **The pill names your color with an arrow** for the way your color travels ("Your color: Glacier ←"). Screen readers hear "which travels left" instead of the arrow.
- **The score is big and thin, with "how far from chance" under it.** During a run it is the live score. At the end it is the recorded score. For a stopped run it is the recorded score over the planned length, which the line explains.
- **A quiet Stop button during the run.** The reference hid the button, which left closing the app as the only way to stop. Stopping is allowed and the run still counts, so there is an outlined, transparent "Stop" in the button's place. It keeps the layout from jumping. The color dot hides during a run.
- **Wording.** Before: "You get one of the two colors at random. For 20 seconds, try to make it spread across the screen." During: "Hold Glacier in mind and will it across." It asks you to try without saying it works. After: the one-run verdict at its real odds.
- **One short vibration (15 ms) at the end of every run, the same for any score.** A stronger buzz for a high score would reward a result that is most likely chance. No vibration on iPhone, where the API is missing.
- **The screen stays on during a run** (Screen Wake Lock, released at the end).
- **The color dot cycles through the preset pairs** as a stand-in until the fan arrives in step 3.

### Icon

A dark square with a circle split by a curved seam: Ember on the left, Glacier on the right, a thin white line between. The circle sits inside the middle 80%, so the 512 px file is also the maskable icon.
