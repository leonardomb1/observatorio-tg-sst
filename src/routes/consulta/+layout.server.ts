import { listConversations, questionsToday } from '#lib/server/assistant/conversations.ts';
import { assistantModel, dailyQuestions } from '#lib/server/assistant/context.ts';
import { visitorSubject } from '#lib/server/assistant/visitor.ts';
import { db } from '#lib/server/db/index.ts';
import { warehouse } from '#lib/server/warehouse.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies, url, depends }) => {
	depends('consulta:conversas');
	const subject = visitorSubject(cookies, url);
	const [conversations, asked, calendar] = await Promise.all([
		listConversations(db, subject),
		questionsToday(db, subject),
		warehouse.calendar()
	]);
	return {
		configured: assistantModel !== null,
		conversations,
		remaining: Math.max(0, dailyQuestions - asked),
		publishedUntil: calendar.publishedUntil
	};
};
