import { getHour } from '../../server/totals.ts';

export const onRequestGet: PagesFunction<Env> = ({ env }) => getHour(env.DB);
