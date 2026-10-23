import { error, redirect, type Cookies } from '@sveltejs/kit';
import { callbackUri, oidcConfig } from './config.ts';
import { authorizeUrl, endSessionUrl } from './oidc.ts';
import { destroySession, FLOW_COOKIE, flowCookie, type Scope } from './session.ts';

const HOME: Record<Scope, string> = { admin: '/admin', consulta: '/consulta' };

function safeTarget(scope: Scope, target: string | null): string {
	const home = HOME[scope];
	const inside = target === home || target?.startsWith(`${home}/`);
	return inside && !target?.startsWith('//') ? (target ?? home) : home;
}

export async function beginLogin(
	url: URL,
	cookies: Cookies,
	scope: Scope,
	target: string | null
): Promise<never> {
	if (!oidcConfig) error(503, 'Login não configurado (OIDC_ISSUER/OIDC_CLIENT_ID).');
	const start = await authorizeUrl(oidcConfig, callbackUri(url));
	const flow = { state: start.state, verifier: start.verifier, target: safeTarget(scope, target) };
	cookies.set(
		FLOW_COOKIE,
		Buffer.from(JSON.stringify(flow)).toString('base64url'),
		flowCookie(url)
	);
	redirect(303, start.url, { external: [new URL(oidcConfig.issuer).origin] });
}

export async function endLogin(url: URL, cookies: Cookies, scope: Scope): Promise<never> {
	const idToken = await destroySession(cookies, url, scope);
	const home = new URL(scope === 'admin' ? '/' : '/consulta', url).toString();
	const target = oidcConfig ? await endSessionUrl(oidcConfig, idToken, home) : null;
	if (!target || !oidcConfig) redirect(303, home);
	redirect(303, target, { external: [new URL(oidcConfig.issuer).origin] });
}
