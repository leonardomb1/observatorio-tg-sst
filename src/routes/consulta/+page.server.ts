import { redirect } from '@sveltejs/kit';
import {
	createConversation,
	listConversations,
	questionsToday
} from '#lib/server/assistant/conversations.ts';
import { assistantModel, dailyQuestions } from '#lib/server/assistant/context.ts';
import { visitorSubject } from '#lib/server/assistant/visitor.ts';
import { db } from '#lib/server/db/index.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const subject = visitorSubject(cookies, url);
	const [conversations, asked] = await Promise.all([
		listConversations(db, subject),
		questionsToday(db, subject)
	]);
	return {
		configured: assistantModel !== null,
		conversations,
		remaining: Math.max(0, dailyQuestions - asked),
		dailyQuestions
	};
};

export const actions: Actions = {
	nova: async ({ cookies, url }) => {
		const id = await createConversation(db, visitorSubject(cookies, url));
		redirect(303, `/consulta/${id}`);
	}
};
