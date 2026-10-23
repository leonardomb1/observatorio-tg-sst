import { error, redirect } from '@sveltejs/kit';
import {
	createConversation,
	listConversations,
	questionsToday
} from '#lib/server/assistant/conversations.ts';
import { assistantModel, dailyQuestions } from '#lib/server/assistant/context.ts';
import { db } from '#lib/server/db/index.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	return {
		configured: assistantModel !== null,
		user: user ? { username: user.username } : null,
		conversations: user ? await listConversations(db, user.subject) : [],
		remaining: user ? Math.max(0, dailyQuestions - (await questionsToday(db, user.subject))) : null,
		dailyQuestions
	};
};

export const actions: Actions = {
	nova: async ({ locals }) => {
		if (!locals.user) error(401, 'Entre para usar a consulta.');
		const id = await createConversation(db, locals.user.subject);
		redirect(303, `/consulta/${id}`);
	}
};
