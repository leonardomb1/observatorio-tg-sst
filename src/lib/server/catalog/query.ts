import type * as z from 'zod';

export type Param = string | number | null;

/** Runs a read-only statement against the datamart; injected so the catalog stays free of SvelteKit. */
export type Query = <Row>(sql: string, params?: Param[]) => Promise<Row[]>;

const TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, { expires: number; value: Promise<unknown> }>();

/**
 * Memoizes a catalog read per arguments. The datamart changes once a month, so an
 * hour of staleness is invisible while keeping the warehouse out of the request path.
 */
export function cached<Args extends Param[], Result>(
	name: string,
	load: (...args: Args) => Promise<Result>
): (...args: Args) => Promise<Result> {
	return (...args) => {
		const key = `${name}:${JSON.stringify(args)}`;
		const hit = cache.get(key);
		if (hit && hit.expires > Date.now()) return hit.value as Promise<Result>;
		const value = load(...args).catch((error: unknown) => {
			cache.delete(key);
			throw error;
		});
		cache.set(key, { expires: Date.now() + TTL_MS, value });
		return value;
	};
}

export async function rows<Schema extends z.ZodType>(
	query: Query,
	schema: Schema,
	sql: string,
	params: Param[] = []
): Promise<z.infer<Schema>[]> {
	const result = await query<unknown>(sql, params);
	return result.map((row) => schema.parse(row));
}
