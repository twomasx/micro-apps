import { APPS, type App } from './routes.ts';

/**
 * What search engines may index. Staging (NOINDEX=true) sends noindex on every response; that header is
 * the only protection, robots.txt does not block staging (see SEO.md rule 7). On production, private pages
 * send noindex: anything that takes a code, a token or a payment return, and personal results.
 */
/** Pages in every app that take a code or a payment return, and the noindex app shell they are served from. */
const PRIVATE_IN_EVERY_APP = new Set(['unlock', 'restore', 'app']);
/** Pages private to one app: personal results and comparisons, where a code is typed, the pass thanks page. */
const PRIVATE_IN_APP: Partial<Record<App, ReadonlySet<string>>> = {
  personality: new Set(['r', 'c', 'pass', 'test']),
  breathwork: new Set(['week', 'custom']),
  attention: new Set(['session', 'test', 'progress']),
  intention: new Set(['me']),
  pass: new Set(['thanks']),
};

export function isPrivate(url: URL): boolean {
  if (url.searchParams.has('passToken') || url.searchParams.has('session_id')) return true;
  const [app, page] = url.pathname.split('/').filter(Boolean);
  if (!app || !page || !(APPS as readonly string[]).includes(app)) return false;
  return PRIVATE_IN_EVERY_APP.has(page) || (PRIVATE_IN_APP[app as App]?.has(page) ?? false);
}

/** Sets X-Robots-Tag. Upstream values (Pages marks its own *.pages.dev addresses noindex) never pass through. */
export function withRobots(response: Response, url: URL, noindexAll: boolean): Response {
  const value = noindexAll ? 'noindex, nofollow' : isPrivate(url) ? 'noindex' : null;
  if (value === null && !response.headers.has('x-robots-tag')) return response;
  const marked = new Response(response.body, response);
  if (value === null) marked.headers.delete('x-robots-tag');
  else marked.headers.set('x-robots-tag', value);
  return marked;
}

/**
 * Crawlers that collect text to train AI models. The same list Cloudflare's managed robots.txt blocks.
 * Search crawlers (Googlebot, Bingbot) and AI search tools that link back (OAI-SearchBot, Claude-SearchBot,
 * PerplexityBot) are not on it, so the pages can still be found and cited.
 */
export const AI_TRAINING_CRAWLERS = [
  'Amazonbot',
  'Applebot-Extended',
  'Bytespider',
  'CCBot',
  'ClaudeBot',
  'Google-Extended',
  'GPTBot',
  'meta-externalagent',
] as const;

/**
 * The whole robots.txt, served by the router on every host. Cloudflare's managed file can't take our Sitemap
 * line, so this replaces it with the same rules (SEO.md step 1). Google-Extended only controls AI training;
 * it has no effect on Google Search. Staging uses the same file: its protection is the noindex header (rule 7).
 */
export function robotsTxt(origin: string): Response {
  const text = [
    '# PolymadLabs. Search engines and AI search tools may crawl every page.',
    '# Crawlers that gather text to train AI models are asked not to.',
    '# Content-Signal says the same: use for search yes, use for AI training no.',
    '',
    'User-agent: *',
    'Content-Signal: search=yes,ai-train=no',
    'Allow: /',
    '',
    ...AI_TRAINING_CRAWLERS.map((agent) => `User-agent: ${agent}`),
    'Disallow: /',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');
  return new Response(text, {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  });
}

/** /sitemap.xml: points to the landing page's sitemap and the sitemap of every live app. */
export function sitemapIndex(origin: string, liveApps: readonly App[]): Response {
  const maps = [`${origin}/_landing/sitemap.xml`, ...liveApps.map((app) => `${origin}/${app}/sitemap.xml`)];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${maps.map((loc) => `  <sitemap><loc>${loc}</loc></sitemap>`).join('\n')}
</sitemapindex>
`;
  return new Response(body, {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  });
}

/** Plain HTTP goes to HTTPS with a 301. Local dev stays on HTTP. */
export function httpsRedirect(url: URL): Response | null {
  if (url.protocol !== 'http:' || url.hostname === 'localhost' || url.hostname === '127.0.0.1') return null;
  return new Response(null, { status: 301, headers: { location: `https://${url.host}${url.pathname}${url.search}` } });
}
