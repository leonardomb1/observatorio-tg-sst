import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.ts';

export function createDb(url: string, maxConnections = 10) {
	const client = postgres(url, { max: maxConnections });
	return drizzle(client, { schema });
}

export type Db = ReturnType<typeof createDb>;
