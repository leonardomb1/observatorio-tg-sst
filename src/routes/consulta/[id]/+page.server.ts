import { error } from '@sveltejs/kit';
import type { ConsultaMessage } from '#lib/consulta.ts';
import {
	findConversation,
	loadMessages,
	questionsToday
} from '#lib/server/assistant/conversations.ts';
import { assistantModel, dailyQuestions } from '#lib/server/assistant/context.ts';
import { visitorSubject } from '#lib/server/assistant/visitor.ts';
import { db } from '#lib/server/db/index.ts';
import { warehouse } from '#lib/server/warehouse.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, params, url }) => {
	const subject = visitorSubject(cookies, url);
	const conversation = /^[0-9a-f-]{36}$/.test(params.id)
		? await findConversation(db, params.id, subject)
		: null;
	if (!conversation) error(404, 'Conversa não encontrada.');
	const [messages, asked, calendar] = await Promise.all([
		loadMessages<ConsultaMessage>(db, conversation.id),
		questionsToday(db, subject),
		warehouse.calendar()
	]);
	return {
		id: conversation.id,
		title: conversation.title,
		messages,
		configured: assistantModel !== null,
		remaining: Math.max(0, dailyQuestions - asked),
		publishedUntil: calendar.publishedUntil
	};
};
