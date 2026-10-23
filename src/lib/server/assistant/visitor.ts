import { randomBytes } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';

const COOKIE = 'obs_visitante';
const ID = /^[A-Za-z0-9_-]{32}$/;
const YEAR_S = 365 * 24 * 3600;

/**
 * Anonymous id that keeps a visitor's conversations and daily quota without a login.
 * It carries no personal data and lives only under /consulta, so the dashboards stay cacheable.
 */
export function visitorSubject(cookies: Cookies, url: URL): string {
	let id = cookies.get(COOKIE);
	if (!id || !ID.test(id)) {
		id = randomBytes(24).toString('base64url');
		cookies.set(COOKIE, id, {
			path: '/consulta',
			httpOnly: true,
			sameSite: 'lax',
			secure: url.protocol === 'https:',
			maxAge: YEAR_S
		});
	}
	return `visitante:${id}`;
}
