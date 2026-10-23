import { endLogin } from '#lib/server/auth/flow.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ url, cookies }) => endLogin(url, cookies, 'admin');
