import { error, redirect } from '@sveltejs/kit';
import * as z from 'zod';
import { adminGroup, assistantGroup, callbackUri, oidcConfig } from '#lib/server/auth/config.ts';
import { exchange } from '#lib/server/auth/oidc.ts';
import { createSession, FLOW_COOKIE, FLOW_PATH, scopeOf } from '#lib/server/auth/session.ts';
import type { RequestHandler } from './$types';

const Flow = z.object({ state: z.string(), verifier: z.string(), target: z.string() });

export const GET: RequestHandler = async ({ url, cookies }) => {
	if (!oidcConfig) error(503, 'Login de administração não configurado.');

	const raw = cookies.get(FLOW_COOKIE);
	cookies.delete(FLOW_COOKIE, { path: FLOW_PATH, secure: url.protocol === 'https:' });
	const flow = raw
		? Flow.safeParse(JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')))
		: null;
	const providerError = url.searchParams.get('error');
	if (providerError) {
		error(
			400,
			`O Authentik recusou o login: ${url.searchParams.get('error_description') ?? providerError}.`
		);
	}
	const code = url.searchParams.get('code');
	if (!flow?.success || !code || url.searchParams.get('state') !== flow.data.state) {
		error(400, 'Sessão de login expirada ou inválida. Tente entrar novamente.');
	}

	const { claims, idToken } = await exchange(
		oidcConfig,
		code,
		flow.data.verifier,
		callbackUri(url)
	);
	const groups = claims.groups ?? [];
	const scope = scopeOf(flow.data.target);
	const required = scope === 'admin' ? adminGroup : assistantGroup;
	if (required && !groups.includes(required)) {
		error(403, `Acesso restrito ao grupo “${required}”.`);
	}

	await createSession(
		cookies,
		url,
		scope,
		{
			subject: claims.sub,
			username: claims.preferred_username ?? claims.sub,
			email: claims.email ?? null,
			groups
		},
		idToken
	);
	redirect(303, flow.data.target);
};
