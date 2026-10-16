/**
 * Writes .og/og.html: the 1200x630 link preview image as a web page, with the real specimens.
 * Render it with any headless browser at 1200x630 and save the result as public/og.png.
 * The browser is not part of the repo (see DESIGN-NOTES.md, "Link preview image").
 *
 *   node scripts/og.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { experiments } from '../src/content.ts';
import { STILL_FRAME } from '../src/motion.ts';
import { specimens } from '../src/specimens/index.ts';

const font = (pkg: string, file: string) =>
  fileURLToPath(new URL(`../node_modules/@fontsource/${pkg}/files/${file}`, import.meta.url));

const faces = [
  ['IBM Plex Sans', 600, font('ibm-plex-sans', 'ibm-plex-sans-latin-600-normal.woff2')],
  ['IBM Plex Sans', 700, font('ibm-plex-sans', 'ibm-plex-sans-latin-700-normal.woff2')],
  ['IBM Plex Mono', 500, font('ibm-plex-mono', 'ibm-plex-mono-latin-500-normal.woff2')],
]
  .map(([family, weight, file]) => `@font-face{font-family:'${family}';font-weight:${weight};src:url('file://${file}') format('woff2')}`)
  .join('\n');

const cards = experiments
  .map(
    (e) => `<div class="card"><div class="slide">${specimens[e.id]()}</div><p><span>${e.number}</span> ${e.name}</p></div>`,
  )
  .join('');

const html = `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><style>
${faces}
*{box-sizing:border-box;margin:0}
body{display:flex;flex-direction:column;width:1200px;height:630px;overflow:hidden;background:#eef0f2;color:#111315;font-family:'IBM Plex Sans';padding:52px 64px}
.top{display:flex;align-items:center;gap:20px;padding-bottom:18px;border-bottom:1px solid #111315}
.mark{font-weight:700;font-size:28px;letter-spacing:-0.01em}
.label,.eyebrow,.card p,.site{font-family:'IBM Plex Mono';font-weight:500;text-transform:uppercase;letter-spacing:.06em}
.label{font-size:17px;color:#4a5058;padding-left:20px;border-left:1px solid #c5cad0}
.site{margin-left:auto;font-size:17px;color:#4a5058;text-transform:none;letter-spacing:0}
.eyebrow{margin-top:48px;font-size:19px;color:#c2410c}
.eyebrow::before{content:'';display:inline-block;width:12px;height:12px;margin-right:12px;background:#c2410c}
h1{margin-top:12px;font-weight:600;font-size:100px;line-height:1;letter-spacing:-0.035em}
.row{display:flex;gap:20px;margin-top:auto}
.card{flex:1}
.slide{position:relative;padding:5px;border:1px solid #111315;background:#f8f9fa}
.slide::after{content:'';position:absolute;top:-1px;right:-1px;width:10px;height:10px;border-top:3px solid #c2410c;border-right:3px solid #c2410c}
.slide svg{display:block;width:100%;height:auto;aspect-ratio:3/2}
.card p{margin-top:10px;font-size:16px}
.card span{color:#c2410c}
</style></head><body>
<div class="top"><p class="mark">PolymadLabs</p><p class="label">Index of experiments</p><p class="site">polymadlabs.com</p></div>
<p class="eyebrow">Subject: you</p>
<h1>You Are The Experiment.</h1>
<div class="row">${cards}</div>
<script>
const still = ${JSON.stringify(STILL_FRAME)};
for (const svg of document.querySelectorAll('svg.specimen-art')) { svg.pauseAnimations(); svg.setCurrentTime(still[svg.dataset.specimen] ?? 0); }
</script>
</body></html>
`;

const out = new URL('../.og/', import.meta.url);
mkdirSync(out, { recursive: true });
writeFileSync(new URL('og.html', out), html);
console.log(fileURLToPath(new URL('og.html', out)));
