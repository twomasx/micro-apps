import { comingSoonPage, homePage, notFoundPage } from './pages.ts';
import { parseLiveApps, route, type App } from './routes.ts';

type Env = {
  STRIP_PREFIX: string;
  /** Comma-separated names of the apps that are deployed. The rest say "Coming soon". */
  LIVE_APPS: string;
  /** The one address people should use, like "polymadlabs.com". Other hostnames redirect to it. */
  CANONICAL_HOST?: string;
} & Record<`${Uppercase<App>}_ORIGIN`, string>;

/** Forwards a request to an app and fixes redirects so they stay under the app's path. */
async function forward(request: Request, url: URL, origin: string, prefix: string, strip: boolean) {
  const path = strip ? url.pathname.slice(prefix.length) : url.pathname;
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

  // Browser storage is kept per hostname, so www and the bare domain must not both serve the apps:
  // someone's saved results would exist on one and not the other.
  if (env.CANONICAL_HOST && url.hostname !== env.CANONICAL_HOST && url.hostname.endsWith(`.${env.CANONICAL_HOST}`)) {
    return Response.redirect(`https://${env.CANONICAL_HOST}${url.pathname}${url.search}`, 308);
  }

  const target = route(url.pathname, parseLiveApps(env.LIVE_APPS));
  switch (target.kind) {
    case 'home':
      return homePage();
    case 'addSlash':
      return Response.redirect(`${url.origin}/${target.app}/${url.search}`, 308);
    case 'comingSoon':
      return comingSoonPage(target.app);
    case 'notFound':
      return notFoundPage();
    case 'app': {
      const origin = env[`${target.app.toUpperCase() as Uppercase<App>}_ORIGIN`];
      return forward(request, url, origin, target.prefix, env.STRIP_PREFIX === 'true');
    }
  }
}

export default {
  async fetch(request, env): Promise<Response> {
    return withoutInjection(await handle(request, env));
  },
} satisfies ExportedHandler<Env>;
