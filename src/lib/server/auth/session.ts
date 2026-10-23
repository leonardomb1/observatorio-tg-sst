import { randomBytes } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { and, eq, gt, lt } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { sessions } from '../db/schema.ts';

export type Scope = 'admin' | 'consulta';

/**
 * Each scope keeps its cookie under its own path, so public pages never carry
 * or set one and stay cacheable. The login callback lives under /admin, which is
 * why the flow cookie uses that path whatever the scope.
 */
const SCOPES: Record<Scope, { cookie: string; path: string }> = {
	admin: { cookie: 'obs_admin', path: '/admin' },
	consulta: { cookie: 'obs_consulta', path: '/consulta' }
};
export const FLOW_COOKIE = 'obs_oidc';
export const FLOW_PATH = '/admin';
const SESSION_HOURS = 12;

export interface SessionUser {
	subject: string;
	username: string;
	email: string | null;
	sessionId: string;
}

export function scopeOf(target: string): Scope {
	return target === '/consulta' || target.startsWith('/consulta/') ? 'consulta' : 'admin';
}

function cookieOptions(url: URL, path: string, maxAge: number) {
	return {
		path,
		httpOnly: true,
		sameSite: 'lax' as const,
		secure: url.protocol === 'https:',
		maxAge
	};
}

export async function createSession(
	cookies: Cookies,
	url: URL,
	scope: Scope,
	user: { subject: string; username: string; email: string | null; groups: string[] },
	idToken: string | null
): Promise<void> {
	const id = randomBytes(32).toString('base64url');
	await db.insert(sessions).values({
		id,
		...user,
		idToken,
		expiresAt: new Date(Date.now() + SESSION_HOURS * 3600_000)
	});
	await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
	const { cookie, path } = SCOPES[scope];
	cookies.set(cookie, id, cookieOptions(url, path, SESSION_HOURS * 3600));
}

export async function readSession(cookies: Cookies, scope: Scope): Promise<SessionUser | null> {
	const id = cookies.get(SCOPES[scope].cookie);
	if (!id) return null;
	const [row] = await db
		.select()
		.from(sessions)
		.where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date())));
	return row
		? { subject: row.subject, username: row.username, email: row.email, sessionId: row.id }
		: null;
}

export async function destroySession(
	cookies: Cookies,
	url: URL,
	scope: Scope
): Promise<string | null> {
	const { cookie, path } = SCOPES[scope];
	const id = cookies.get(cookie);
	cookies.delete(cookie, { path, secure: url.protocol === 'https:' });
	if (!id) return null;
	const [row] = await db.delete(sessions).where(eq(sessions.id, id)).returning();
	return row?.idToken ?? null;
}

export function flowCookie(url: URL) {
	return cookieOptions(url, FLOW_PATH, 600);
}
