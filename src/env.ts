import { defineEnvVars } from '@sveltejs/kit/env';
import * as z from 'zod';

const optional = (value: string | undefined) => (value === '' ? undefined : value);

export const variables = defineEnvVars({
	DATABASE_URL: {
		description: 'Postgres connection string for the app database (pgvector).',
		schema: z.url()
	},
	STARROCKS_HOST: { description: 'StarRocks FE host (MySQL protocol).', schema: z.string().min(1) },
	STARROCKS_PORT: {
		description: 'StarRocks FE query port.',
		schema: z.string().default('9030').transform(Number).pipe(z.number().int().positive())
	},
	STARROCKS_USER: {
		description: 'Read-only StarRocks user with SELECT on dm_sst only. Never root.',
		schema: z
			.string()
			.min(1)
			.refine((user) => user !== 'root', 'The app must not connect to StarRocks as root')
	},
	STARROCKS_PASSWORD: { description: 'Password of STARROCKS_USER.', schema: z.string() },
	STARROCKS_DATABASE: {
		description: 'Datamart schema the app reads from.',
		schema: z.string().default('dm_sst')
	},
	STARROCKS_QUERY_TIMEOUT_S: {
		description: 'Per-query timeout applied to every StarRocks session, in seconds.',
		schema: z.string().default('30').transform(Number).pipe(z.number().int().positive())
	},
	VOYAGE_API_KEY: {
		description: 'Voyage AI key for embeddings and reranking. Without it search is lexical only.',
		schema: optional
	},
	RERANK_MODEL: {
		description: 'Voyage reranker model.',
		schema: z.string().default('rerank-2.5')
	},
	PUBLIC_ORIGIN: {
		description: 'Public origin of the site, used for the OIDC redirect URI behind the proxy.',
		schema: optional
	},
	OIDC_ISSUER: {
		description: 'Authentik issuer URL of the observatory provider.',
		schema: optional
	},
	OIDC_CLIENT_ID: { description: 'OIDC client id.', schema: optional },
	OIDC_CLIENT_SECRET: {
		description: 'OIDC client secret (confidential client).',
		schema: optional
	},
	ADMIN_GROUP: {
		description: 'Authentik group whose members may use /admin.',
		schema: z.string().default('Observatório Admins')
	},
	ANTHROPIC_API_KEY: {
		description:
			'Claude API key for the assistant. Without it /consulta says it is not configured.',
		schema: optional
	},
	ASSISTANT_DAILY_QUESTIONS: {
		description: 'Questions each visitor (anonymous cookie) may ask the assistant per day.',
		schema: z.string().default('30').transform(Number).pipe(z.number().int().positive())
	},
	ASSISTANT_CONNECTION_PER_MINUTE: {
		description:
			'Questions per network address (or per event code) per minute; stops floods, not a classroom.',
		schema: z.string().default('20').transform(Number).pipe(z.number().int().positive())
	},
	ASSISTANT_DAILY_BUDGET_USD: {
		description:
			'What the assistant may spend on the model per day, outside event codes. At 80% answers use lower effort; at 100% the assistant pauses until midnight.',
		schema: z.string().default('10').transform(Number).pipe(z.number().positive())
	},
	TURNSTILE_SITE_KEY: {
		description: 'Cloudflare Turnstile site key for the assistant start step (public).',
		schema: optional
	},
	TURNSTILE_SECRET_KEY: {
		description: 'Cloudflare Turnstile secret key.',
		schema: optional
	}
});
