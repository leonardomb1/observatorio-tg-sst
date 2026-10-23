import { and, eq, sql } from 'drizzle-orm';
import * as z from 'zod';
import type { Db } from '../db/client.ts';
import { assistantConsents } from '../db/schema.ts';

const Verdict = z.object({ success: z.boolean() });

/** Asks Cloudflare whether the start step was completed by a person. */
export async function verifyTurnstile(
	secret: string,
	token: string,
	address: string
): Promise<boolean> {
	const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
		method: 'POST',
		body: new URLSearchParams({ secret, response: token, remoteip: address }),
		signal: AbortSignal.timeout(10_000)
	});
	if (!response.ok) return false;
	return Verdict.parse(await response.json()).success;
}

export interface Consent {
	eventCode: string | null;
}

export async function findConsent(
	db: Db,
	visitor: string,
	termsVersion: string
): Promise<Consent | null> {
	const [row] = await db
		.select({ eventCode: assistantConsents.eventCode })
		.from(assistantConsents)
		.where(
			and(
				eq(assistantConsents.visitorId, visitor),
				eq(assistantConsents.termsVersion, termsVersion)
			)
		);
	return row ?? null;
}

/** Stores the clickwrap record; accepting again only refreshes the event code. */
export async function recordConsent(
	db: Db,
	visitor: string,
	termsVersion: string,
	eventCode: string | null
): Promise<void> {
	await db
		.insert(assistantConsents)
		.values({ visitorId: visitor, termsVersion, eventCode })
		.onConflictDoUpdate({
			target: [assistantConsents.visitorId, assistantConsents.termsVersion],
			set: { eventCode: sql`coalesce(excluded.event_code, ${assistantConsents.eventCode})` }
		});
}
