import { createResult } from '../../../server/results.ts';

export const onRequestPost: PagesFunction<Env> = ({ request, env }) =>
  createResult(request, env.DB);
