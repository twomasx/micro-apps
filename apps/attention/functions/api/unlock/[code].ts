import { readSettings } from '@micro/payments/settings';
import { checkUnlockCode } from '../../../server/purchases.ts';

export const onRequestGet: PagesFunction<Env, 'code'> = ({ params, env }) =>
  checkUnlockCode(String(params.code), env.DB, readSettings(env).mode);
