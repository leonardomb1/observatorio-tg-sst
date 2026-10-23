import { redirect } from '@sveltejs/kit';
import { oidcConfig } from '#lib/server/auth/config.ts';
import { endSessionUrl } from '#lib/server/auth/oidc.ts';
import { destroySession } from '#lib/server/auth/session.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ url, cookies }) => {
	const idToken = await destroySession(cookies, url);
	const home = new URL('/', url).toString();
	const target = oidcConfig ? await endSessionUrl(oidcConfig, idToken, home) : null;
	redirect(303, target ?? '/');
};
