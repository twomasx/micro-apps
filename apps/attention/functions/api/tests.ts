import { recordTest } from '../../server/tests.ts';

export const onRequestPost: PagesFunction<Env> = ({ request, env }) => recordTest(request, env.DB);
