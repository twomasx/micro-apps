import { comingSoonPage, notFoundPage } from './pages.ts';
import { landingPath, parseLiveApps, route, type App } from './routes.ts';
import { httpsRedirect, robotsTxt, sitemapIndex, withRobots } from './seo.ts';

type Env = {
  STRIP_PREFIX: string;
  /** Comma-separated names of the apps that are deployed. The rest say "Coming soon". */
  LIVE_APPS: string;
  /** The one address people should use, like "polymadlabs.com". Other hostnames redirect to it. */
  CANONICAL_HOST?: string;
  /** The landing page app, served at `/`. */
  LANDING_ORIGIN: string;
  /** "true" on staging: search engines are asked not to index anything. */
  NOINDEX?: string;
  /** This environment's address, like https://polymadlabs.com. Used in robots.txt and the sitemap index. */
  PUBLIC_ORIGIN?: string;
} & Record<`${Uppercase<App>}_ORIGIN`, string>;

/** Forwards a request to `path` on an app and fixes redirects so they stay under the app's path. */
async function forward(request: Request, url: URL, origin: string, path: string, prefix: string, strip: boolean) {
  const response = await fetch(new Request(new URL(path + url.search, origin), request));

  // The app thinks it lives at "/", so its own redirects need the prefix put back.
  const location = response.headers.get('location');
  if (!strip || !location?.startsWith('/') || location.startsWith('//')) return response;
  const fixed = new Response(response.body, response);
  fixed.headers.set('location', `${prefix}${location}`);
  return fixed;
}

/**
 * Cloudflare can add its Web Analytics script to any HTML page on the domain.
 * We allow no outside analytics, and `no-transform` tells Cloudflare to leave the page alone.
 */
export function withoutInjection(response: Response): Response {
  if (!response.headers.get('content-type')?.includes('text/html')) return response;
  const cacheControl = response.headers.get('cache-control');
  if (cacheControl?.includes('no-transform')) return response;
  const marked = new Response(response.body, response);
  marked.headers.set('cache-control', cacheControl ? `${cacheControl}, no-transform` : 'no-transform');
  return marked;
}

async function handle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const toHttps = httpsRedirect(url);
  if (toHttps) return toHttps;

  // Browser storage is kept per hostname, so www and the bare domain must not both serve the apps:
  // someone's saved results would exist on one and not the other.
  if (env.CANONICAL_HOST && url.hostname !== env.CANONICAL_HOST && url.hostname.endsWith(`.${env.CANONICAL_HOST}`)) {
    return Response.redirect(`https://${env.CANONICAL_HOST}${url.pathname}${url.search}`, 308);
  }

  const origin = env.PUBLIC_ORIGIN ?? url.origin;
  if (url.pathname === '/robots.txt') return robotsTxt(origin);
  if (url.pathname === '/sitemap.xml') return sitemapIndex(origin, parseLiveApps(env.LIVE_APPS));

  const strip = env.STRIP_PREFIX === 'true';
  const target = route(url.pathname, parseLiveApps(env.LIVE_APPS));
  switch (target.kind) {
    case 'landing':
      return forward(request, url, env.LANDING_ORIGIN, landingPath(url.pathname, strip), '', strip);
    case 'addSlash':
      return Response.redirect(`${url.origin}/${target.app}/${url.search}`, 308);
    case 'comingSoon':
      return comingSoonPage(target.app);
    case 'notFound':
      return notFoundPage();
    case 'app': {
      const origin = env[`${target.app.toUpperCase() as Uppercase<App>}_ORIGIN`];
      const path = strip ? url.pathname.slice(target.prefix.length) : url.pathname;
      return forward(request, url, origin, path, target.prefix, strip);
    }
  }
}

export default {
  async fetch(request, env): Promise<Response> {
    const response = withoutInjection(await handle(request, env));
    return withRobots(response, new URL(request.url), env.NOINDEX === 'true');
  },
} satisfies ExportedHandler<Env>;
