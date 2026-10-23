import { createHash, randomBytes } from 'node:crypto';
import { and, gte, isNull, sql } from 'drizzle-orm';
import type { Db } from '../db/client.ts';
import { assistantUsage } from '../db/schema.ts';

const WINDOW_MS = 60_000;
const salt = randomBytes(16).toString('hex');
const recent = new Map<string, number[]>();

/** A salted hash of the address, so no address is ever kept, not even in memory. */
export function addressKey(address: string): string {
	return createHash('sha256')
		.update(salt + address)
		.digest('base64url');
}

/**
 * Counts a question against a one-minute window and says whether it fits under the
 * ceiling. It stops a script hammering the assistant without blocking a classroom that
 * shares one address over the day.
 */
export function withinBurst(key: string, ceiling: number): boolean {
	const now = Date.now();
	const times = (recent.get(key) ?? []).filter((time) => now - time < WINDOW_MS);
	if (times.length >= ceiling) {
		recent.set(key, times);
		return false;
	}
	times.push(now);
	recent.set(key, times);
	if (recent.size > 10_000) {
		for (const [other, list] of recent) {
			if (list.every((time) => now - time >= WINDOW_MS)) recent.delete(other);
		}
	}
	return true;
}

/**
 * Claude Sonnet 5.5 list prices in dollars per million tokens. Cache writes use the
 * five-minute rate, 1.25 times the input price.
 */
const PRICE = { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 };

/** Dollars spent today (Brasília time) outside event codes, which have their own pool. */
export async function spentTodayUsd(db: Db): Promise<number> {
	const midnight = sql`date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'`;
	const [row] = await db
		.select({
			input: sql<string>`coalesce(sum(${assistantUsage.inputTokens} - ${assistantUsage.cacheReadTokens} - ${assistantUsage.cacheWriteTokens}), 0)`,
			output: sql<string>`coalesce(sum(${assistantUsage.outputTokens}), 0)`,
			cacheRead: sql<string>`coalesce(sum(${assistantUsage.cacheReadTokens}), 0)`,
			cacheWrite: sql<string>`coalesce(sum(${assistantUsage.cacheWriteTokens}), 0)`
		})
		.from(assistantUsage)
		.where(and(gte(assistantUsage.createdAt, midnight), isNull(assistantUsage.eventCode)));
	if (!row) return 0;
	return (
		(Number(row.input) * PRICE.input +
			Number(row.output) * PRICE.output +
			Number(row.cacheRead) * PRICE.cacheRead +
			Number(row.cacheWrite) * PRICE.cacheWrite) /
		1_000_000
	);
}
