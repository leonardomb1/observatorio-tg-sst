import type { UIMessage } from 'ai';
import { and, asc, count, desc, eq, gte, sql } from 'drizzle-orm';
import type { Db } from '../db/client.ts';
import { assistantUsage, conversationMessages, conversations } from '../db/schema.ts';

const TITLE_CHARS = 90;

export async function createConversation(db: Db, subject: string): Promise<string> {
	const [row] = await db
		.insert(conversations)
		.values({ subject })
		.returning({ id: conversations.id });
	if (!row) throw new Error('Conversa não criada');
	return row.id;
}

export function listConversations(db: Db, subject: string) {
	return db
		.select({
			id: conversations.id,
			title: conversations.title,
			updatedAt: conversations.updatedAt
		})
		.from(conversations)
		.where(eq(conversations.subject, subject))
		.orderBy(desc(conversations.updatedAt))
		.limit(50);
}

export async function findConversation(db: Db, id: string, subject: string) {
	const [row] = await db
		.select()
		.from(conversations)
		.where(and(eq(conversations.id, id), eq(conversations.subject, subject)));
	return row ?? null;
}

export async function loadMessages<Message extends UIMessage = UIMessage>(
	db: Db,
	conversationId: string
): Promise<Message[]> {
	const rows = await db
		.select({ message: conversationMessages.message })
		.from(conversationMessages)
		.where(eq(conversationMessages.conversationId, conversationId))
		.orderBy(asc(conversationMessages.seq));
	return rows.map((row) => row.message as Message);
}

function firstText(message: UIMessage): string | null {
	const text = message.parts.find((part) => part.type === 'text')?.text.trim();
	if (!text) return null;
	return text.length > TITLE_CHARS ? `${text.slice(0, TITLE_CHARS - 1).trimEnd()}…` : text;
}

/**
 * Stores the messages after the ones already saved. History is never rewritten:
 * Sonnet 5.5 binds its thinking blocks to the exact prefix that produced them.
 */
export async function appendMessages(
	db: Db,
	conversationId: string,
	saved: number,
	messages: readonly UIMessage[]
): Promise<void> {
	const fresh = messages.slice(saved);
	if (fresh.length === 0) return;
	await db.transaction(async (tx) => {
		await tx
			.insert(conversationMessages)
			.values(
				fresh.map((message, index) => ({
					id: message.id,
					conversationId,
					seq: saved + index,
					role: message.role,
					message
				}))
			)
			.onConflictDoNothing();
		const question = messages.find((message) => message.role === 'user');
		await tx
			.update(conversations)
			.set({
				updatedAt: new Date(),
				title: sql`coalesce(${conversations.title}, ${question ? firstText(question) : null})`
			})
			.where(eq(conversations.id, conversationId));
	});
}

/** Counted when the question arrives, so a failed or cut stream still uses the quota. */
export async function openUsage(
	db: Db,
	usage: { subject: string; conversationId: string; model: string }
): Promise<number> {
	const [row] = await db.insert(assistantUsage).values(usage).returning({ id: assistantUsage.id });
	if (!row) throw new Error('Uso não registrado');
	return row.id;
}

export async function closeUsage(
	db: Db,
	id: number,
	totals: {
		inputTokens: number;
		outputTokens: number;
		cacheReadTokens: number;
		cacheWriteTokens: number;
		steps: number;
		finishReason: string | null;
	}
): Promise<void> {
	await db.update(assistantUsage).set(totals).where(eq(assistantUsage.id, id));
}

/** Questions asked since midnight in Brasília. */
export async function questionsToday(db: Db, subject: string): Promise<number> {
	const [row] = await db
		.select({ total: count() })
		.from(assistantUsage)
		.where(
			and(
				eq(assistantUsage.subject, subject),
				gte(
					assistantUsage.createdAt,
					sql`date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'`
				)
			)
		);
	return row?.total ?? 0;
}
