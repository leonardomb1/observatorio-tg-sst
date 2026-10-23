import { beginLogin } from '#lib/server/auth/flow.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url, cookies }) =>
	beginLogin(url, cookies, 'consulta', url.searchParams.get('voltar'));
