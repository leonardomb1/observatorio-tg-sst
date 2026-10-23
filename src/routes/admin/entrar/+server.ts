import { error, redirect } from '@sveltejs/kit';
import { callbackUri, oidcConfig } from '#lib/server/auth/config.ts';
import { authorizeUrl } from '#lib/server/auth/oidc.ts';
import { FLOW_COOKIE, flowCookie } from '#lib/server/auth/session.ts';
import type { RequestHandler } from './$types';

function safeTarget(target: string | null): string {
	return target?.startsWith('/admin') && !target.startsWith('//') ? target : '/admin';
}

export const GET: RequestHandler = async ({ url, cookies }) => {
	if (!oidcConfig)
		error(503, 'Login de administração não configurado (OIDC_ISSUER/OIDC_CLIENT_ID).');
	const start = await authorizeUrl(oidcConfig, callbackUri(url));
	const flow = {
		state: start.state,
		verifier: start.verifier,
		target: safeTarget(url.searchParams.get('voltar'))
	};
	cookies.set(
		FLOW_COOKIE,
		Buffer.from(JSON.stringify(flow)).toString('base64url'),
		flowCookie(url)
	);
	redirect(303, start.url, { external: [new URL(oidcConfig.issuer).origin] });
};
