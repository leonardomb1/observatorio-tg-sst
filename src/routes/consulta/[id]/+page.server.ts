import { error, redirect } from '@sveltejs/kit';
import type { ConsultaMessage } from '#lib/consulta.ts';
import {
	findConversation,
	loadMessages,
	questionsToday
} from '#lib/server/assistant/conversations.ts';
import { assistantModel, dailyQuestions } from '#lib/server/assistant/context.ts';
import { db } from '#lib/server/db/index.ts';
import { warehouse } from '#lib/server/warehouse.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const user = locals.user;
	if (!user) redirect(303, `/consulta/entrar?voltar=${encodeURIComponent(url.pathname)}`);
	const conversation = /^[0-9a-f-]{36}$/.test(params.id)
		? await findConversation(db, params.id, user.subject)
		: null;
	if (!conversation) error(404, 'Conversa não encontrada.');
	const [messages, asked, calendar] = await Promise.all([
		loadMessages<ConsultaMessage>(db, conversation.id),
		questionsToday(db, user.subject),
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
