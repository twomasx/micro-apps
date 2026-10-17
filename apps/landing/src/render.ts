import { appConfig } from '../app.config.ts';
import { experiments, passLine, protocol, studySheet, type Experiment } from './content.ts';
import { refunds, terms, type LegalPage } from './legal.ts';
import { specimens } from './specimens/index.ts';

/**
 * Builds the repeated parts of the page from content.ts when Vite builds it.
 * index.html holds a marker comment for each part, like <!-- render:index -->.
 */

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function row(e: Experiment): string {
  return `<li class="entry" id="${e.id}">
  <p class="entry-number" aria-hidden="true">${e.number}</p>
  <figure class="specimen" data-app="${e.id}" aria-hidden="true">${specimens[e.id]()}</figure>
  <div class="entry-name">
    <h3>${escape(e.name)}</h3>
    <p class="entry-path">${escape(e.path)}</p>
  </div>
  <dl class="entry-fields">
    <div class="field"><dt>You do</dt><dd>${escape(e.youDo)}</dd></div>
    <div class="field"><dt>You get</dt><dd>${escape(e.youGet)}</dd></div>
  </dl>
  <a class="entry-open" href="${e.path}">Open<span class="visually-hidden"> ${escape(e.name)}</span><span class="entry-arrow" aria-hidden="true">&#8594;</span></a>
</li>`;
}

const TITLE = 'PolymadLabs: You Are The Experiment';
const DESCRIPTION = 'Five small apps. Each one measures, trains or tests one part of your mind. Free to start, no account needed.';

/** Link preview tags. Previews need absolute URLs, so these use the published origin. */
function meta(): string {
  const page = `${appConfig.origin}/`;
  const image = `${appConfig.origin}${appConfig.base}og.png`;
  return [
    `<link rel="canonical" href="${page}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="PolymadLabs" />`,
    `<meta property="og:url" content="${page}" />`,
    `<meta property="og:title" content="${TITLE}" />`,
    `<meta property="og:description" content="${DESCRIPTION}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="PolymadLabs. You Are The Experiment. An index of five experiments." />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${TITLE}" />`,
    `<meta name="twitter:description" content="${DESCRIPTION}" />`,
    `<meta name="twitter:image" content="${image}" />`,
  ].join('\n    ');
}

/** A terms or refund page, from src/legal.ts. */
function legal(page: LegalPage): string {
  const sections = page.sections
    .map(
      (section) =>
        `<section class="legal-section">\n<h2>${escape(section.heading)}</h2>\n${section.paragraphs.map((p) => `<p>${escape(p)}</p>`).join('\n')}\n</section>`,
    )
    .join('\n');
  return `<h1>${escape(page.title)}</h1>\n<p class="legal-updated">${escape(page.updated)}</p>\n<p class="legal-intro">${escape(page.intro)}</p>\n${sections}`;
}

const parts: Record<string, () => string> = {
  meta,
  sheet: () =>
    studySheet.map(([label, value]) => `<div class="sheet-row"><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join('\n'),
  index: () => experiments.map(row).join('\n'),
  protocol: () =>
    protocol
      .map(
        (step, i) =>
          `<li class="step"><p class="step-number">Step ${i + 1}</p><h3>${escape(step.title)}</h3><p>${escape(step.text)}</p></li>`,
      )
      .join('\n'),
  pass: () =>
    `<p class="protocol-pass">${escape(passLine.text)} <a href="${passLine.path}">${escape(passLine.link)}</a></p>`,
  terms: () => legal(terms),
  refunds: () => legal(refunds),
  'legal-links': () => '<li><a href="/terms">Terms of use</a></li>\n<li><a href="/refunds">Refund policy</a></li>',
  'footer-links': () => experiments.map((e) => `<li><a href="${e.path}">${escape(e.name)}</a></li>`).join('\n'),
};

/** Replaces every <!-- render:name --> marker in the page. Unknown names are an error, so typos fail the build. */
export function renderPage(html: string): string {
  return html.replace(/<!-- render:([a-z-]+) -->/g, (_, name: string) => {
    const part = parts[name];
    if (!part) throw new Error(`index.html asks for an unknown part: ${name}`);
    return part();
  });
}
