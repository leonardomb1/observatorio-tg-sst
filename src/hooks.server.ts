import { redirect } from '@sveltejs/kit';
import type { Handle, HandleServerError } from '@sveltejs/kit/hooks';
import { dev } from '$app/env';
import { oidcConfig } from '#lib/server/auth/config.ts';
import { readSession } from '#lib/server/auth/session.ts';

const securityHeaders = {
	'x-content-type-options': 'nosniff',
	'referrer-policy': 'strict-origin-when-cross-origin',
	'permissions-policy': 'camera=(), microphone=(), geolocation=()',
	'x-frame-options': 'SAMEORIGIN'
};

const isAdmin = (path: string) => path === '/admin' || path.startsWith('/admin/');
const isLogin = (path: string) => path === '/admin/entrar' || path.startsWith('/admin/entrar/');
const isConsulta = (path: string) => path === '/consulta' || path.startsWith('/consulta/');

export const handle: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;

	if (isAdmin(path) && !isLogin(path)) {
		if (dev && !oidcConfig) {
			event.locals.admin = { username: 'dev', email: null, sessionId: 'dev' };
		} else {
			const admin = await readSession(event.cookies);
			if (!admin) redirect(303, `/admin/entrar?voltar=${encodeURIComponent(path)}`);
			event.locals.admin = admin;
		}
	}

	const response = await resolve(event);
	for (const [name, value] of Object.entries(securityHeaders)) {
		response.headers.set(name, value);
	}
	if (isAdmin(path) || isConsulta(path)) response.headers.set('cache-control', 'private, no-store');
	return response;
};

export const handleError: HandleServerError = ({ kind, error, event }) => {
	const id = crypto.randomUUID();
	if (kind === 'unknown') {
		console.error(
			JSON.stringify({ level: 'error', id, path: event.url.pathname, error: String(error) })
		);
	}
	return { id };
};
