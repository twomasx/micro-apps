import { allowedOrigins, corsRoute, preflight } from '../../server/cors.ts';
import { paymentsContext } from '../../server/passes.ts';
import { createToken } from '../../server/tokens.ts';

export const onRequestOptions: PagesFunction<Env> = ({ request, env }) => preflight(request, allowedOrigins(env.ALLOWED_ORIGINS));

export const onRequestPost: PagesFunction<Env> = ({ request, env }) =>
  corsRoute(request, env.ALLOWED_ORIGINS, () => createToken(request, paymentsContext(env), env.DB));
