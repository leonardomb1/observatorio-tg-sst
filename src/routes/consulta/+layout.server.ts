import { allowance } from '#lib/server/assistant/allowance.ts';
import { allowanceSettings, assistantModel, turnstile } from '#lib/server/assistant/context.ts';
import { listConversations } from '#lib/server/assistant/conversations.ts';
import { readVisitor } from '#lib/server/assistant/visitor.ts';
import { db } from '#lib/server/db/index.ts';
import { warehouse } from '#lib/server/warehouse.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies, depends }) => {
	depends('consulta:conversas');
	const visitor = readVisitor(cookies);
	const [allowed, calendar] = await Promise.all([
		allowance(db, visitor, allowanceSettings),
		warehouse.calendar()
	]);
	return {
		configured: assistantModel !== null && turnstile !== null,
		turnstileSiteKey: turnstile?.siteKey ?? null,
		started: allowed.started,
		event: allowed.event,
		remaining: allowed.remaining,
		paused: allowed.paused,
		conversations: allowed.started && visitor ? await listConversations(db, visitor) : [],
		publishedUntil: calendar.publishedUntil
	};
};
