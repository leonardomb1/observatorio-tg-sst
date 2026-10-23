import { randomBytes } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { and, eq, gt, lt } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { sessions } from '../db/schema.ts';

const SESSION_COOKIE = 'obs_admin';
export const FLOW_COOKIE = 'obs_oidc';
/** Every admin cookie stays under /admin so public pages never carry or set one. */
export const COOKIE_PATH = '/admin';
const SESSION_HOURS = 12;

export interface AdminUser {
	username: string;
	email: string | null;
	sessionId: string;
}

function cookieOptions(url: URL, maxAge: number) {
	return {
		path: COOKIE_PATH,
		httpOnly: true,
		sameSite: 'lax' as const,
		secure: url.protocol === 'https:',
		maxAge
	};
}

export async function createSession(
	cookies: Cookies,
	url: URL,
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
	cookies.set(SESSION_COOKIE, id, cookieOptions(url, SESSION_HOURS * 3600));
}

export async function readSession(cookies: Cookies): Promise<AdminUser | null> {
	const id = cookies.get(SESSION_COOKIE);
	if (!id) return null;
	const [row] = await db
		.select()
		.from(sessions)
		.where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date())));
	return row ? { username: row.username, email: row.email, sessionId: row.id } : null;
}

export async function destroySession(cookies: Cookies, url: URL): Promise<string | null> {
	const id = cookies.get(SESSION_COOKIE);
	cookies.delete(SESSION_COOKIE, { path: COOKIE_PATH, secure: url.protocol === 'https:' });
	if (!id) return null;
	const [row] = await db.delete(sessions).where(eq(sessions.id, id)).returning();
	return row?.idToken ?? null;
}

export function flowCookie(url: URL) {
	return cookieOptions(url, 600);
}
