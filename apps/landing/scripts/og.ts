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
  fileURLToPath(new URL(`../node_modules/@fontsource${pkg}/files/${file}`, import.meta.url));

const faces = [
  ['Unbounded', '300', font('/unbounded', 'unbounded-latin-300-normal.woff2')],
  ['Unbounded', '400', font('/unbounded', 'unbounded-latin-400-normal.woff2')],
  ['Manrope', '200 800', font('-variable/manrope', 'manrope-latin-wght-normal.woff2')],
  ['IBM Plex Sans', '700', font('/ibm-plex-sans', 'ibm-plex-sans-latin-700-normal.woff2')],
]
  .map(([family, weight, file]) => `@font-face{font-family:'${family}';font-weight:${weight};src:url('file://${file}') format('woff2')}`)
  .join('\n');

// Each app's ground and its accent as it reads on the dark page, from src/styles/base.css.
const colors: Record<string, [string, string]> = {
  personality: ['#f5f4f0', '#8c9cff'],
  focus: ['#080a1c', '#e6c88f'],
  breathwork: ['#2341d6', '#ffd45c'],
  attention: ['#f3f3ef', '#f3f3ef'],
  intention: ['#141416', '#f37a54'],
};

const cards = experiments
  .map((e) => {
    const [ground, glow] = colors[e.id]!;
    return `<div class="card" style="--ground:${ground};--glow:${glow}"><div class="window">${specimens[e.id]()}</div><p><span>${e.number}</span>${e.name}</p></div>`;
  })
  .join('');

const html = `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><style>
${faces}
*{box-sizing:border-box;margin:0}
body{position:relative;display:flex;flex-direction:column;width:1200px;height:630px;overflow:hidden;padding:44px 64px 52px;color:#eef0f8;font-family:Manrope;
background:radial-gradient(760px 480px at 88% -90px,rgb(52 70 190/40%),transparent 70%),radial-gradient(560px 420px at -120px 360px,rgb(242 104 60/14%),transparent 70%),#07091a}
body::before{content:'';position:absolute;inset:0;z-index:-1;opacity:.8;background-image:
radial-gradient(1.6px 1.6px at 8% 14%,#fff 50%,transparent 52%),radial-gradient(1.2px 1.2px at 18% 34%,#fff 50%,transparent 52%),
radial-gradient(1.4px 1.4px at 29% 9%,#f3ebdd 50%,transparent 52%),radial-gradient(1.2px 1.2px at 41% 24%,#fff 50%,transparent 52%),
radial-gradient(1.8px 1.8px at 56% 7%,#fff 50%,transparent 52%),radial-gradient(1.2px 1.2px at 63% 31%,#b4c2ff 50%,transparent 52%),
radial-gradient(1.4px 1.4px at 74% 16%,#fff 50%,transparent 52%),radial-gradient(1.7px 1.7px at 86% 10%,#f3ebdd 50%,transparent 52%),
radial-gradient(1.2px 1.2px at 94% 36%,#fff 50%,transparent 52%),radial-gradient(1.2px 1.2px at 4% 52%,#fff 50%,transparent 52%);
-webkit-mask-image:linear-gradient(#000 45%,transparent 70%)}
.top{display:flex;align-items:center;gap:14px}
.mark{display:flex;align-items:center;gap:14px;font-family:Unbounded;font-weight:400;font-size:24px}
.mark::before{content:'';width:26px;height:26px;border:2.5px solid #a7add0;border-radius:50%;background:radial-gradient(circle at 85% 20%,#e6c88f 0 4.4px,transparent 5.2px)}
.site{margin-left:auto;font-size:19px;font-weight:600;color:#a7add0}
.eyebrow{margin-top:40px;text-align:center;font-size:17px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#e6c88f}
h1{margin-top:14px;text-align:center;font-family:Unbounded;font-weight:300;font-size:74px;line-height:1.05;letter-spacing:-0.02em}
h1 span{background:linear-gradient(90deg,#8c9cff,#e6c88f 45%,#ffd45c 60%,#f37a54);-webkit-background-clip:text;background-clip:text;color:transparent}
.row{display:flex;gap:22px;margin-top:auto}
.card{flex:1}
.window{overflow:hidden;border-radius:18px;background:var(--ground);box-shadow:0 0 0 1px color-mix(in srgb,var(--glow) 50%,transparent),0 16px 40px -16px color-mix(in srgb,var(--glow) 65%,transparent)}
.window svg{display:block;width:100%;height:auto;aspect-ratio:3/2}
.card p{display:flex;align-items:center;gap:10px;margin-top:14px;font-size:19px;font-weight:700}
.card span{display:grid;place-items:center;width:32px;height:32px;border:1.5px solid var(--glow);border-radius:50%;color:var(--glow);font-family:Unbounded;font-weight:400;font-size:12px}
</style></head><body>
<div class="top"><p class="mark">PolymadLabs</p><p class="site">polymadlabs.com</p></div>
<p class="eyebrow">Subject: you</p>
<h1>You Are The <span>Experiment.</span></h1>
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
