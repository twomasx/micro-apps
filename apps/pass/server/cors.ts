/**
 * Apps on other domains call the pass API from the browser, so it answers cross-origin requests from the
 * origins in ALLOWED_ORIGINS. A request from any other site is refused outright, not only hidden from it.
 * Requests with no Origin header (app servers asking for personality and intention) are allowed.
 */
export function allowedOrigins(setting: string | undefined): Set<string> {
  return new Set(
    (setting ?? '')
      .split(',')
      .map((origin) => origin.trim().replace(/\/$/, ''))
      .filter(Boolean),
  );
}

export type Cors = { allowed: true; headers: Record<string, string> } | { allowed: false };

export function cors(request: Request, allowed: Set<string>): Cors {
  const origin = request.headers.get('Origin');
  if (origin === null) return { allowed: true, headers: {} };
  if (!allowed.has(origin)) return { allowed: false };
  return {
    allowed: true,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    },
  };
}

/** Adds the CORS headers to a response. */
export function withHeaders(response: Response, headers: Record<string, string>): Response {
  if (Object.keys(headers).length === 0) return response;
  const copy = new Response(response.body, response);
  for (const [name, value] of Object.entries(headers)) copy.headers.set(name, value);
  return copy;
}

/** OPTIONS, the browser's question before a cross-origin POST. */
export function preflight(request: Request, allowed: Set<string>): Response {
  const answer = cors(request, allowed);
  if (!answer.allowed) return new Response(null, { status: 403 });
  return new Response(null, { status: 204, headers: answer.headers });
}

/** Runs a handler with CORS: refuses other sites, adds the headers for allowed ones. */
export async function corsRoute(
  request: Request,
  allowedSetting: string | undefined,
  handler: () => Promise<Response>,
): Promise<Response> {
  const answer = cors(request, allowedOrigins(allowedSetting));
  if (!answer.allowed) {
    return Response.json({ error: 'origin_not_allowed', message: 'This site may not use the pass API.' }, { status: 403 });
  }
  return withHeaders(await handler(), answer.headers);
}
