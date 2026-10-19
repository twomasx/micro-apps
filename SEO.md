# SEO plan for polymadlabs.com

The goal: when someone searches for a thing one of our apps does ("box breathing timer", "40 Hz binaural beats", "attention span test", "psychokinesis test"), they find a fast page with that exact thing on it and can start in one tap.

This file covers all five apps, the landing page and the router. It is a suite-wide task like PAYMENTS.md, so the "one app at a time" rule is lifted for it. Still work through it one app at a time inside each step, and commit after each app.

## What's true today (checked Oct 16, 2026)

- **Landing page (/):** good. Title, description, canonical, Open Graph image and real text are all in the HTML.
- **All five apps:** the HTML is an empty shell. The title is one word ("Focus", "Attention", "Personality test"), there is no canonical link, no Open Graph tags and no body text until JavaScript runs. Personality has no meta description.
- **No sitemap.** `/sitemap.xml` does not load.
- **robots.txt** is Cloudflare's managed file. It blocks AI training crawlers (GPTBot, ClaudeBot, CCBot, Google-Extended), allows everything else and sets `Content-Signal: search=yes, ai-train=no`. Google-Extended does not affect Google Search. Keep this as is unless Roger says otherwise.
  - **Update, Oct 16:** Cloudflare does not combine its managed file with one from the router, and on production the managed file turned out to hold only the content-signal comments, with no rules. Decision: the router serves the whole robots.txt with the rules above plus the Sitemap line, and the managed file is turned off when the production router goes out (DEPLOY.md, "Deploy the router").

Why the empty shell matters: Google can run JavaScript, but pages that need it wait in a second queue, sometimes for days or weeks, and new low-authority sites wait longest. Titles and descriptions set by JavaScript can be missed in the first pass. Many other crawlers (Bing's previews, link previews in messaging apps, AI search tools) read only the raw HTML. So every page we want found must have its title, description, canonical, share tags, structured data and its main text in the HTML the server sends.

## Rules

1. **Honest claims carry over.** Every app's "Honest claims" and wording rules apply to page titles, descriptions, headings and structured data too. No "boosts IQ", "syncs your brainwaves", "prove your psychic powers", "clinically proven". Evidence labels ("Some research", "Mixed results", "Little research") appear on the pages that discuss the evidence.
2. **No fake ratings or reviews.** Google's app rich result needs a rating or review. We have none, so we don't get that rich result. Never add `aggregateRating` or `review` markup.
3. **No trademarked test names.** Never use "MBTI", "Myers-Briggs" or "16Personalities" in titles, descriptions, headings or markup. "Four-letter personality type" and "Big Five" are fine.
4. **No outside scripts.** No analytics, tag managers or SEO widgets. The CSP rules in PAYMENTS.md still hold.
5. **Plain, direct copy.** Short sentences, name the thing directly, no em dashes, no filler intros ("In today's fast-paced world").
6. **One page, one search.** Each new page targets one search phrase, answers it in the first screen and has the tool's start button above the fold on a phone. No keyword stuffing, no near-duplicate pages.
7. **Staging is never indexed.** Every response from staging.polymadlabs.com and from `*.pages.dev` preview URLs sends `X-Robots-Tag: noindex, nofollow`. That header is the only protection: staging does not serve `Disallow: /`. Google merges groups for the same user-agent, and with Cloudflare's managed `Allow: /` in front, an Allow of the same length beats the Disallow, so it would block nothing. A crawler blocked by robots.txt would also never see the noindex header. Test this.
8. **Private pages are never indexed.** These send `noindex`: personality result pages `/personality/r/*` and comparisons `/personality/c/*`, every `/unlock` and `/restore` page, `/pass/` actions that take a code or token, and anything with `?passToken=` or an unlock code in the URL.
9. **Production only.** Canonical URLs, sitemaps and share tags always use the production origin from `PUBLIC_ORIGIN`, never a hardcoded domain, so an app can move to its own domain later by changing config.

## Step 1: Technical base (every app plus the router)

**Static HTML for every indexable route.** Look at how each app builds today and propose the simplest way to send real HTML for each indexable route: a build-time prerender of the route, or a static HTML file per route that loads the app. Show Roger the approach before changing all five apps. Requirements:

- `<title>`, meta description, canonical, Open Graph (`og:title`, `og:description`, `og:url`, `og:image` 1200×630 with `og:image:alt`, `og:type`, `og:site_name`), `twitter:card` = `summary_large_image`, and JSON-LD, all in the server-sent HTML.
- The page's main text (the H1, the intro and any content sections) is in the HTML before JavaScript runs. The app can take over after load. Content hidden with CSS is fine; content fetched after load doesn't count.
- One H1 per page.
- `lang="en"` on `<html>`.

**Status codes.** Unknown paths return a real 404 status with a small 404 page, not the app shell with 200. Check this on every app, because single-page app fallbacks often get it wrong.

**Redirects.** `www.polymadlabs.com` sends a 301 to `polymadlabs.com`. Pick one trailing slash style per app (the apps use `/focus/`) and send a 301 from the other. HTTP goes to HTTPS (Cloudflare already does this; confirm it).

**Share images.** One 1200×630 PNG per app in the app's own style, plus one for each new content page (step 2) that names the technique. Generate them at build time from an HTML or SVG template so they stay in sync. Keep each under 300 KB.

**Sitemaps.** Each app serves `/<app>/sitemap.xml` listing its indexable URLs, without `lastmod` (a build date on every page would say every page changed on every deploy). The router serves `/sitemap.xml` as a sitemap index pointing to the landing page sitemap and each live app's sitemap (from `LIVE_APPS`), and adds `Sitemap: https://polymadlabs.com/sitemap.xml` to robots.txt. If Cloudflare's managed robots.txt can't take an extra line, have the router serve robots.txt with the same rules as the managed file plus the Sitemap line, and tell Roger to turn off the managed file. Ask before touching that setting.

**Structured data (JSON-LD).**

- Landing page: `WebSite` and `Organization` (name PolymadLabs, url, logo using the 512 icon).
- Each app's home: `WebApplication` with `name`, `url`, `description`, `applicationCategory` (`HealthApplication` for focus, breathwork and attention; `LifestyleApplication` for personality; `EducationalApplication` for intention), `operatingSystem` "Any (web browser)", `isAccessibleForFree: true` and `offers` listing the free tier at price 0 and the paid unlock at its real price from `config/products.json`. Prices come from config at build time, never typed into templates.
- Content pages (step 2): `Article` with `headline`, `datePublished`, `dateModified`, `author` (Organization PolymadLabs), plus `BreadcrumbList`.
- FAQ markup no longer produces rich results (Google stopped showing them in 2026), so don't add `FAQPage` markup. Plain question headings on the page are still useful.

**Speed.** Largest Contentful Paint under 2.5 s on a mid-range Android phone over 4G. Fonts are already self-hosted; preload the one used above the fold. Defer anything not needed for the first screen.

**Stop: show Roger `view-source` of one page per app (on staging) with the title, description, canonical, share tags, JSON-LD and body text visible. Show the 404 check, the staging noindex header and the sitemap index.**

## Step 2: Titles, descriptions and new pages

Titles stay under 60 characters and descriptions under 155, so Google shows them whole. Tune the wording if needed, but keep the main phrase at the front of the title.

### Existing pages

| Page | Main search phrase | Title | Meta description |
| --- | --- | --- | --- |
| `/` | science-based mind apps | PolymadLabs: Five Free Experiments on Your Mind | Five small apps that measure, train or test one part of your mind. Free to start, no account, no ads. |
| `/personality/` | free personality test | Free Personality Test: Your Type in 6 Minutes | 40 questions built on Big Five research. Get your four-letter type with a percentage on each scale. Free result, no email, no account. |
| `/personality/science` | Big Five personality test | How This Personality Test Works: Big Five Research | Where the 40 questions come from, how the four scales map to Big Five traits, and how each percentage is scored. |
| `/focus/` | binaural beats for focus | Binaural Beats for Focus: Free Online Player | Two tones, one in each ear, made live in your browser. Five presets from 2 to 40 Hz, each with its research. Free, no sign-up. |
| `/focus/science` | do binaural beats work | Do Binaural Beats Work? What the Research Shows | What studies found for each beat rate, from sleep to 40 Hz, with sources. Some results are real, many are mixed. |
| `/breathwork/` | breathing exercise timer | Breathing Exercise Timer: Box, 4-7-8, Cyclic Sigh | A guided breathing timer. Pick a technique, press start and follow the dot around its shape. Free, no sign-up. |
| `/breathwork/science` | breathing techniques research | Breathing Techniques: What the Research Shows | Cyclic sighing, box breathing, 4-7-8 and resonant breathing compared, with the evidence for each and safety notes. |
| `/attention/` | attention training | Attention Training: 10 Minutes a Day, Eyes Closed | Train attention with your eyes closed, based on a 2019 UCSF study, and measure it with a standard research test. |
| `/attention/science` | how to improve attention span | How Attention Training Works: The Study and Test | The 2019 study behind the training, how sessions adapt to you, and how the SART attention test is scored. |
| `/intention/` | psychokinesis test | Psychokinesis Test: Can Your Mind Move Numbers? | A 20-second test with random bits made on our server. Every run is logged and scored against chance. Nobody has proven this. Test it. |
| `/intention/global` | psychokinesis experiment results | Global Results: Every Intention Run, Scored | Every run anyone has ever done, combined into one line and compared against chance. Updated every 5 minutes. |
| `/intention/science` | PEAR experiment random number generator | The Science of Mind and Random Numbers | Princeton's PEAR lab, the failed replication, the 2006 meta-analysis, and why our server makes the bits. |
| `/pass/` | (brand) | PolymadLabs Pass: Every App, One Payment | Unlock every PolymadLabs app, including future ones, for one payment. No account, no renewals. |

Use the real price in descriptions only if it comes from config at build time.

### New content pages

Each one is a real page with its own URL, title, description, share image and 300 to 700 words of original text, in that app's visual style. The first screen on a phone shows the H1, one or two lines answering the search and a start button that opens the tool with that technique or preset selected (for example `/breathwork/?t=box`). Below that: how to do it, what the research says (with the evidence label and sources from the app's data files, read at build time so they never drift), who should be careful (safety notes from the app), and links to the related pages.

Locked items stay honest: a page about a paid technique or preset (Resonant breathing, the 40 Hz Deep focus preset) says it's part of the unlock, and the title never says "free". If the app has a free preview for it, say how long it runs.

| App | URL | Search phrase | Title |
| --- | --- | --- | --- |
| breathwork | `/breathwork/box-breathing/` | box breathing timer | Box Breathing Timer: Free Guided 4-4-4-4 Breathing |
| breathwork | `/breathwork/4-7-8-breathing/` | 4-7-8 breathing timer | 4-7-8 Breathing Timer: Free Guided Exercise |
| breathwork | `/breathwork/cyclic-sighing/` | cyclic sighing | Cyclic Sighing: Free Guided Timer and the Study |
| breathwork | `/breathwork/resonant-breathing/` | resonant breathing, 6 breaths per minute | Resonant Breathing: Guided 6 Breaths a Minute |
| focus | `/focus/40-hz-binaural-beats/` | 40 Hz binaural beats | 40 Hz Binaural Beats: Try It and See the Research |
| focus | `/focus/binaural-beats-for-studying/` | binaural beats for studying | Binaural Beats for Studying: What Helps, What Doesn't |
| focus | `/focus/binaural-beats-for-sleep/` | binaural beats for sleep | Binaural Beats for Sleep: Free 2 Hz Player |
| attention | `/attention/attention-span-test/` | attention span test | Attention Span Test: The SART, Free in Your Browser |
| attention | `/attention/sart/` | SART test, sustained attention to response task | The SART Attention Test, Explained and Free to Try |
| personality | `/personality/couples/` | couples personality test | Couples Personality Test: Compare Your Types Free |
| intention | `/intention/pear-experiment/` | PEAR experiment, Princeton random number generator | The PEAR Experiment: Try It Yourself, 20 Seconds |

Notes per app:

- **Attention:** most "attention span test" results are opinion quizzes. Ours is the real SART from Robertson and others (1997). Say that plainly: "Most attention span tests are quizzes. This is the test researchers use."
- **Focus:** the competing pages overclaim. Our angle is the honest one: what studies found per beat rate, with the evidence label. "Headphones required" in the first screen.
- **Intention:** competitors are old (Fourmilab's RetroPsychoKinesis project, PsychicScience.org). Our angle: modern, server-made random bits, every run logged, a live global result, and the stance "Nobody has proven this. Test it yourself." Never say quantum (the source is cryptographic) and never claim the effect exists.
- **Personality:** the most competitive search on the list. Don't expect `/personality/` to rank quickly. The couples page and the type pages (step 3) are where we can win.

**Stop after the first breathwork page** (`/breathwork/box-breathing/`) so Roger can check it on his phone: the first screen, the start button, the length and the tone. Then build the rest using it as the pattern.

**Personality is Roger's design.** He designed that app himself. Build its new pages as clean semantic HTML using the app's existing styles and classes, and list anything that needs a design decision in `apps/personality/DESIGN-TODO.md`.

## Step 3: Personality type pages (proposal only)

People search for each type ("INTJ personality", "ENFP strengths"). Sixteen pages, `/personality/types/intj/` and so on, could bring the most traffic of anything here, but that is about 16 × 500 words of original writing, and the space is crowded.

Don't build this yet. Write a short proposal: one sample page (INTJ) drafted from the app's own type descriptions, the template, and an estimate of the work. **Stop for Roger's decision.** Rules if he says yes: no nicknames from other tests, no copied text, each page links to the free test.

## Step 4: Checks

- `view-source` (not DevTools) of every indexable URL shows the title, description, canonical, share tags, JSON-LD and main text.
- Every new page's title is under 60 characters and its description under 155. Add a test that fails the build if one goes over or if two pages share a title.
- Google's Rich Results Test passes for one page per app (Roger runs it, or Claude Code gives him the URLs).
- Lighthouse SEO score 100 and Performance 90+ on mobile for each app's home and one content page.
- Unknown URLs return 404. `/personality/r/*`, `/unlock`, `/restore` send noindex.
- Staging sends noindex on every response. Production does not.
- Share preview works: paste a link into a messaging app and the image and title show.
- `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm build` all pass.

Deploy to staging first. Go to production only when Roger says so.

## Roger's part (off the codebase)

1. **Google Search Console:** add `polymadlabs.com` as a Domain property. Verification means adding a DNS TXT record in Cloudflare; that's a live DNS change, so Roger does it. Then submit `https://polymadlabs.com/sitemap.xml` and use URL Inspection on each app's home to request indexing.
2. **Bing Webmaster Tools:** import from Search Console (one click). Bing's index also feeds DuckDuckGo and some AI search tools.
3. **A few honest links:** the site is new and has no links pointing to it, which is the main reason a new site ranks slowly. Good first places: a "Show HN" post for Intention (the strict, open protocol fits that crowd), a Product Hunt launch for the suite, and an answer in a relevant community when someone asks for exactly what an app does. No paid links, no link swaps.
4. **Patience:** expect weeks to months before steady search traffic. Search Console will show which phrases start getting impressions; we adjust titles from that data, not from guesses.

## Build order

1. Step 1 for the router and landing page, then one app (breathwork). **Stop: Roger checks view-source, the 404 and staging noindex.**
2. Step 1 for the other four apps. Commit after each.
3. Step 2 titles and descriptions for every existing page.
4. `/breathwork/box-breathing/`. **Stop: Roger reviews on his phone.**
5. The other new content pages, one app at a time.
6. Step 3 proposal. **Stop for Roger's decision.**
7. Step 4 checks on staging. **Stop: show Roger the results.**
8. Production deploy only on Roger's word.

## Later

- Type pages, if Roger approves step 3.
- Adjust titles from Search Console data after about 6 weeks.
- When an app moves to its own domain: 301 every old URL to the new one, one to one, and update `PUBLIC_ORIGIN`.

## Sources

- Google Search Central, Software App structured data: https://developers.google.com/search/docs/appearance/structured-data/software-app
- JavaScript SEO in 2026, rendering queue and client-side tags: https://www.rewatikhare.com/post/javascript-seo-in-2026-what-google-actually-handles-vs-what-still-bites-you
- Structured data changes in 2026 (FAQ and How-To rich results ended): https://webwise.digital/blog/google-structured-data-guidelines-2026-update
- Cloudflare managed robots.txt contents: https://dev.to/hey_atlas_5d684863e9b069a/i-audited-my-own-robotstxt-and-found-cloudflare-was-blocking-the-ai-crawlers-i-wanted-4b77
- What ranks for "breathing exercise timer": https://calmly.io/, https://breathwork.tools/, https://relaxation.page/tools/breathing-exercise
- What ranks for "attention span test": https://www.psychologytoday.com/us/tests/personality/attention-span-test, https://schultelab.org/attention-test/
- What ranks for "40 Hz binaural beats": https://mynoise.net/NoiseMachines/forty40HzBrainwaveGenerator.php, https://openbinauralbeats.com/40hz-binaural-beats/
- What ranks for "psychokinesis test": https://www.fourmilab.ch/rpkp/, https://psychicscience.org/PKTests
- What ranks for "couples personality test": https://openjung.org/test/couple
