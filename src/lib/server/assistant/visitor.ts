import { randomBytes } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';

const COOKIE = 'obs_visitante';
const ID = /^[A-Za-z0-9_-]{32}$/;
const YEAR_S = 365 * 24 * 3600;

const subjectOf = (id: string) => `visitante:${id}`;

/** The anonymous visitor, if this browser already went through the start step. */
export function readVisitor(cookies: Cookies): string | null {
	const id = cookies.get(COOKIE);
	return id && ID.test(id) ? subjectOf(id) : null;
}

/**
 * Keeps the existing anonymous id or creates one. It carries no personal data and lives
 * only under /consulta, so the dashboards stay cacheable.
 */
export function issueVisitor(cookies: Cookies, url: URL): string {
	const current = readVisitor(cookies);
	if (current) return current;
	const id = randomBytes(24).toString('base64url');
	cookies.set(COOKIE, id, {
		path: '/consulta',
		httpOnly: true,
		sameSite: 'lax',
		secure: url.protocol === 'https:',
		maxAge: YEAR_S
	});
	return subjectOf(id);
}
