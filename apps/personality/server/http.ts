// Results change when a purchase lands, so no API response is cached.
const HEADERS = { 'Cache-Control': 'no-store' };

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: HEADERS });
}

export function error(status: number, code: string, message: string): Response {
  return json({ error: code, message }, status);
}

export function noContent(): Response {
  return new Response(null, { status: 204, headers: HEADERS });
}
