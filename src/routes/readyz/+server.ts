import { sql } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { query } from '#lib/server/starrocks.ts';
import type { RequestHandler } from './$types';

async function probe(check: () => Promise<unknown>): Promise<'ok' | 'down'> {
	try {
		await check();
		return 'ok';
	} catch {
		return 'down';
	}
}

export const GET: RequestHandler = async () => {
	const [postgres, starrocks] = await Promise.all([
		probe(() => db.execute(sql`select 1`)),
		probe(() => query('SELECT 1'))
	]);
	const healthy = postgres === 'ok' && starrocks === 'ok';
	return Response.json(
		{ postgres, starrocks },
		{ status: healthy ? 200 : 503, headers: { 'cache-control': 'no-store' } }
	);
};
