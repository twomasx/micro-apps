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

### Icon

A dark square with a circle split by a curved seam: Ember on the left, Glacier on the right, a thin white line between. The circle sits inside the middle 80%, so the 512 px file is also the maskable icon.
