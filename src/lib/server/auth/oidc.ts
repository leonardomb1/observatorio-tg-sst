import { createHash, randomBytes } from 'node:crypto';

const TIMEOUT_MS = 10_000;

export interface OidcConfig {
	issuer: string;
	clientId: string;
	clientSecret: string | undefined;
}

interface Discovery {
	authorization_endpoint: string;
	token_endpoint: string;
	end_session_endpoint?: string;
}

export interface Claims {
	sub: string;
	preferred_username?: string;
	email?: string;
	groups?: string[];
}

let cached: Promise<Discovery> | null = null;

function discover(config: OidcConfig): Promise<Discovery> {
	cached ??= (async () => {
		const url = new URL('.well-known/openid-configuration', config.issuer.replace(/\/*$/, '/'));
		const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
		if (!response.ok) throw new Error(`OIDC discovery failed (${response.status})`);
		const document = (await response.json()) as Partial<Discovery>;
		if (!document.authorization_endpoint || !document.token_endpoint) {
			throw new Error('OIDC discovery document lacks the required endpoints');
		}
		return document as Discovery;
	})().catch((error: unknown) => {
		cached = null;
		throw error;
	});
	return cached;
}

export async function authorizeUrl(config: OidcConfig, redirectUri: string) {
	const { authorization_endpoint } = await discover(config);
	const state = randomBytes(32).toString('base64url');
	const verifier = randomBytes(32).toString('base64url');
	const url = new URL(authorization_endpoint);
	url.searchParams.set('response_type', 'code');
	url.searchParams.set('client_id', config.clientId);
	url.searchParams.set('redirect_uri', redirectUri);
	url.searchParams.set('scope', 'openid profile email');
	url.searchParams.set('state', state);
	url.searchParams.set('code_challenge', createHash('sha256').update(verifier).digest('base64url'));
	url.searchParams.set('code_challenge_method', 'S256');
	return { url: url.toString(), state, verifier };
}

/**
 * Claims are read from the id_token without verifying its signature: it comes
 * straight from the token endpoint over TLS (OIDC Core 3.1.3.7).
 */
function decodeClaims(idToken: string): Claims {
	const payload = idToken.split('.')[1];
	if (!payload) throw new Error('Malformed id_token');
	const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Claims;
	if (!claims.sub) throw new Error('id_token without sub');
	return claims;
}

export async function exchange(
	config: OidcConfig,
	code: string,
	verifier: string,
	redirectUri: string
): Promise<{ claims: Claims; idToken: string }> {
	const { token_endpoint } = await discover(config);
	const body = new URLSearchParams({
		grant_type: 'authorization_code',
		code,
		redirect_uri: redirectUri,
		code_verifier: verifier,
		client_id: config.clientId
	});
	if (config.clientSecret) body.set('client_secret', config.clientSecret);
	const response = await fetch(token_endpoint, {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body,
		signal: AbortSignal.timeout(TIMEOUT_MS)
	});
	if (!response.ok) throw new Error(`OIDC token request failed (${response.status})`);
	const token = (await response.json()) as { id_token?: string };
	if (!token.id_token) throw new Error('Token response without id_token');
	return { claims: decodeClaims(token.id_token), idToken: token.id_token };
}

export async function endSessionUrl(
	config: OidcConfig,
	idToken: string | null,
	postLogout: string
): Promise<string | null> {
	const { end_session_endpoint } = await discover(config);
	if (!end_session_endpoint) return null;
	const url = new URL(end_session_endpoint);
	url.searchParams.set('client_id', config.clientId);
	if (idToken) {
		url.searchParams.set('id_token_hint', idToken);
		url.searchParams.set('post_logout_redirect_uri', postLogout);
	}
	return url.toString();
}
