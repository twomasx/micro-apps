const APPS = ['personality', 'focus', 'breathwork', 'attention', 'intention'] as const;
type App = (typeof APPS)[number];

type Env = { STRIP_PREFIX: string } & Record<`${Uppercase<App>}_ORIGIN`, string>;

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const app = APPS.find((a) => url.pathname === `/${a}` || url.pathname.startsWith(`/${a}/`));

    if (!app) {
      return new Response('polymadlabs.com placeholder', {
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      });
    }

    const prefix = `/${app}`;
    if (url.pathname === prefix) {
      return Response.redirect(`${url.origin}${prefix}/${url.search}`, 308);
    }

    const origin = env[`${app.toUpperCase() as Uppercase<App>}_ORIGIN`];
    const path = env.STRIP_PREFIX === 'true' ? url.pathname.slice(prefix.length) : url.pathname;
    return fetch(new Request(new URL(path + url.search, origin), request));
  },
} satisfies ExportedHandler<Env>;
