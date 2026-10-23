import {
	ADMIN_GROUP,
	ASSISTANT_GROUP,
	OIDC_CLIENT_ID,
	OIDC_CLIENT_SECRET,
	OIDC_ISSUER,
	PUBLIC_ORIGIN
} from '$app/env/private';
import type { OidcConfig } from './oidc.ts';

export const adminGroup = ADMIN_GROUP;
export const assistantGroup = ASSISTANT_GROUP ?? null;

export const oidcConfig: OidcConfig | null =
	OIDC_ISSUER && OIDC_CLIENT_ID
		? { issuer: OIDC_ISSUER, clientId: OIDC_CLIENT_ID, clientSecret: OIDC_CLIENT_SECRET }
		: null;

/** Must equal the redirect URI registered in Authentik, so it uses the public origin. */
export function callbackUri(url: URL): string {
	return new URL('/admin/entrar/retorno', PUBLIC_ORIGIN ?? url.origin).toString();
}
