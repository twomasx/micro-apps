// Plain pages with no design. Roger owns the look; these only follow the mobile rules.
const HEADERS = { 'content-type': 'text/html; charset=utf-8' };
const FIRST_APP = { href: '/personality/', label: 'Personality test' };
/** The apps linked from the home page, in the order they launched. */
const HOME_APPS = [FIRST_APP, { href: '/breathwork/', label: 'Breathwork' }];

function page(title: string, body: string, status: number): Response {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <link rel="icon" href="data:," />
    <title>${title}</title>
  </head>
  <body>
    <main>
${body}
    </main>
  </body>
</html>
`;
  return new Response(html, { status, headers: HEADERS });
}

const link = `      <p><a href="${FIRST_APP.href}">${FIRST_APP.label}</a></p>`;

const homeLinks = HOME_APPS.map((app) => `      <p><a href="${app.href}">${app.label}</a></p>`).join('\n');

export function homePage(): Response {
  return page('PolymadLabs', `      <h1>PolymadLabs</h1>\n${homeLinks}`, 200);
}

export function comingSoonPage(app: string): Response {
  const name = app.charAt(0).toUpperCase() + app.slice(1);
  return page(
    `${name}: coming soon | PolymadLabs`,
    `      <h1>Coming soon</h1>\n      <p>${name} is not ready yet.</p>\n${link}`,
    200,
  );
}

export function notFoundPage(): Response {
  return page(
    'Page not found | PolymadLabs',
    `      <h1>Page not found</h1>\n      <p><a href="/">PolymadLabs</a></p>`,
    404,
  );
}
