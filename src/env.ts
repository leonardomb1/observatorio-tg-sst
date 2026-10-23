import { defineEnvVars } from '@sveltejs/kit/env';
import * as z from 'zod';

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
	}
});
