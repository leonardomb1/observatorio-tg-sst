import { randomBytes } from 'node:crypto';
import { and, count, desc, eq, gt, isNull, lte, sql } from 'drizzle-orm';
import type { Db } from '../db/client.ts';
import { assistantUsage, eventCodes } from '../db/schema.ts';

export type EventCode = typeof eventCodes.$inferSelect;

const CODE = /^[A-Z0-9-]{4,32}$/;

export function normalizeCode(raw: string): string | null {
	const code = raw.trim().toUpperCase();
	return CODE.test(code) ? code : null;
}

/** A readable code from the label, with a random tail so it cannot be guessed. */
export function codeFrom(label: string): string {
	const stem = label
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toUpperCase()
		.replace(/[^A-Z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 20);
	return `${stem || 'EVENTO'}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

/** The code if it exists, is not revoked and its window includes now. */
export async function findActiveEvent(db: Db, code: string): Promise<EventCode | null> {
	const now = new Date();
	const [row] = await db
		.select()
		.from(eventCodes)
		.where(
			and(
				eq(eventCodes.code, code),
				isNull(eventCodes.revokedAt),
				lte(eventCodes.startsAt, now),
				gt(eventCodes.endsAt, now)
			)
		);
	return row ?? null;
}

/** Questions asked under a code, in total and by one visitor. */
export async function eventUse(
	db: Db,
	code: string,
	subject: string
): Promise<{ total: number; mine: number }> {
	const [row] = await db
		.select({
			total: count(),
			mine: sql<number>`count(*) filter (where ${assistantUsage.subject} = ${subject})`.mapWith(
				Number
			)
		})
		.from(assistantUsage)
		.where(eq(assistantUsage.eventCode, code));
	return { total: row?.total ?? 0, mine: row?.mine ?? 0 };
}

export async function createEvent(
	db: Db,
	event: Omit<EventCode, 'createdAt' | 'revokedAt'>
): Promise<void> {
	await db.insert(eventCodes).values(event);
}

export function listEvents(db: Db) {
	return db
		.select({
			code: eventCodes.code,
			label: eventCodes.label,
			startsAt: eventCodes.startsAt,
			endsAt: eventCodes.endsAt,
			questionPool: eventCodes.questionPool,
			perVisitor: eventCodes.perVisitor,
			revokedAt: eventCodes.revokedAt,
			used: sql<number>`(select count(*) from ${assistantUsage} where ${assistantUsage.eventCode} = ${eventCodes.code})`.mapWith(
				Number
			)
		})
		.from(eventCodes)
		.orderBy(desc(eventCodes.createdAt));
}

export async function revokeEvent(db: Db, code: string): Promise<void> {
	await db.update(eventCodes).set({ revokedAt: new Date() }).where(eq(eventCodes.code, code));
}
