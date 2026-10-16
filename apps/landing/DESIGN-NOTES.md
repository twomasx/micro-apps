# Design notes: landing page

What was decided, and why. Roger chose the direction ("Lab Index") from three mockups; the execution here is Claude's. Open questions and device checks are in `DESIGN-TODO.md`.

## The idea

The visitor is the test subject, and the page reads like a study protocol: a study sheet, a numbered index of experiments, a three-step protocol. Every visual choice serves that: ruled lines, mono labels, numbered entries, nothing decorative that a printed lab document would not have.

## Color

| Token | Value | Use |
| --- | --- | --- |
| Ground | `#eef0f2` | Page background. Cool gray, like lab paper under fluorescent light. |
| Paper | `#f8f9fa` | The study sheet and specimen slides. A step lighter so they read as objects on the page. |
| Ink | `#111315` | Text, rules, buttons. |
| Muted | `#4a5058` | Labels and secondary text. 7.13:1 on ground. |
| Rule | `#c5cad0` | Thin lines between rows. Decorative only, never text. |
| Accent | `#c2410c` | Burnt orange from the mockup, kept. Entry numbers, the eyebrow, the slide corner mark, button hover. 4.53:1 on ground, so it passes for text. |
| Band | `#121417` | The protocol section. |
| Band accent | `#f0884f` | The accent lightened for the dark band, where `#c2410c` would only reach 2.7:1. 7.33:1. |

Why burnt orange: no app uses it as an accent. Personality and Breathwork are cobalt, and Intention's Ember (`#f2683c`) is lighter and pinker, so the landing page never looks like one of the apps.

## Type

- **IBM Plex Sans** 400, 600, 700 for reading and headings. **IBM Plex Mono** 400, 500 for labels, numbers and paths. Engineered, slightly technical, and unlike any app's faces: Personality uses Inter Tight, Focus Cormorant and Manrope, Breathwork Outfit, Attention Shippori Mincho and Zen Kaku Gothic, and Intention Unbounded and Inter Tight.
- Latin subset only, self-hosted. About 100 KB of woff2 in total, all `font-display: swap`.
- Headline 600 with tight tracking (-0.035em), sized by viewport width on phones (14vw) up to 96 px.
- Mono labels are uppercase with 0.06em tracking at 13 px. They are labels, not body text; body text is 16 px or more everywhere.

## Layout

- **Phone:** each index entry is a card: number and name, the specimen at full width, labeled "You do" and "You get", and a full-width 48 px Open button.
- **Tablet (640 px):** specimen on the left, text on the right. Protocol steps go to three columns.
- **Desktop (1024 px):** one row per entry, like a table: number, specimen, name and path, "You do", "You get", Open. The labels stay visible in every layout, so no hidden header row is needed and every field says what it is.
- The hero puts the study sheet beside the headline on desktop and under it on phones.

## Specimens

Each entry shows a small "specimen": the app's real signature visual, on a slide (a ruled frame with a paper margin and the accent corner mark). They are inline SVG, generated from TypeScript at build time, so none of the drawing code ships to the browser. Each one is drawn from reading the app's own code; the source file is named at the top of each specimen module.

| App | What it shows | Corrections to the brief |
| --- | --- | --- |
| Personality | The result screen: a large type code (ENFP as the example) over four scale bars, cobalt fill and marker from the centre. Letters fade in one after another; markers slide out, as in the app. | The brief's placeholder was four sliders. The real signature is the type code over the bars. Set in Plex Sans 700, not the app's Inter Tight, to avoid a sixth font file. |
| Focus | The Orbit: navy sky with the nebula glow and a fixed starfield, two stars opposite each other on one circle with fading trails, a faint timer ring filling with gold. Turns once every 7.2 s, the Focus preset's idle speed. | The brief said warm left, cool right. In the app both stars are warm: cream for the left ear, gold for the right. Only the sky is cool. |
| Breathwork | The Pattern: the cyclic sigh, box and 4-7-8 in turn, each built with the app's rule (one side per phase, length in proportion to seconds). The yellow dot moves in real time, a white line follows it, and the halo swells on the breath in. | None. |
| Attention | The Ink: one enso by a smaller version of the app's brush (same start, sweep, press and dry-brush tail), revealed along the brush's path, held, and faded. | None. |
| Intention | The field, Night style: Ember and Glacier split by a soft white seam that sways with the app's own three-sine wave and leans in a fixed loop. Pale band on Glacier's side, specks drifting off the seam, dark shading at the edges. | The brief called it "Superposition". That name appears nowhere in the app, so the page does not use it. |

### Motion

- SMIL animations inside each SVG, so the whole thing needs no animation library. CSS cannot pause SMIL, so `src/motion.ts` does: a specimen only runs while it is on screen.
- With `prefers-reduced-motion`, each specimen holds one still frame chosen to show the app at its most recognisable (`STILL_FRAME`). Off-screen specimens also wait at that frame, so none is ever blank.
- Page motion is limited to the Open button's hover color and a 3 px arrow nudge, both off under reduced motion.

## Link preview image

`public/og.png` (1200x630) shows the header, the headline and all five specimens at their still frames. `node scripts/og.ts` writes it as a web page at `.og/og.html`; render that page at 1200x630 with headless Chromium and save the screenshot over `public/og.png`. The browser is not a repo dependency (see the shared memory on running Chromium in WSL). `public/apple-touch-icon.png` is `favicon.svg` rendered at 180 px.

## Copy changes from the brief

All approved by Roger on Oct 15, 2026. Each one fixed a line the app's code contradicted.

- Subhead: "measures or trains" became "measures, trains or tests", because Intention tests a question.
- Personality, You get: also the percentage on each scale, which the free result shows.
- Focus, You do: "for 10 minutes", the default Prime length. You get: "Two tones, one in each ear. The research on them is mixed, so test it on yourself." Roger's wording, matching the app's own evidence labels.
- Breathwork, You get: names the three free techniques.
- Attention: the training is eyes-closed breath focus of 10 minutes or more, and stretch lengths are self-reported, so "You get" names the longest stretch held and the attention test score instead of "how long you can hold your attention".
- Intention, You do: the server picks your color at random, so "Pick a color" became "get one of two colors at random".
- No prices on the page: they would drift from each app's `products.json`.

## Budget (Oct 15, 2026)

- JavaScript: 0.66 KB gzipped. CSS: 2.55 KB gzipped. HTML with all five specimens: 22.3 KB gzipped.
- Largest paint 452 ms on a 375 px phone, 420 ms at 768 px, 428 ms at 1280 px, in headless Chromium through the router with the slow 4G profile (150 ms latency, 1.6 Mbps) and the CPU slowed 4x. The largest element is the headline.
