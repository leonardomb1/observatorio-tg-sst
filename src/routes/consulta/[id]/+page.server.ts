import { error } from '@sveltejs/kit';
import type { ConsultaMessage } from '#lib/consulta.ts';
import { findConversation, loadMessages } from '#lib/server/assistant/conversations.ts';
import { redactMessages } from '#lib/server/assistant/redact.ts';
import { readVisitor } from '#lib/server/assistant/visitor.ts';
import { db } from '#lib/server/db/index.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, params }) => {
	const visitor = readVisitor(cookies);
	const conversation =
		visitor && /^[0-9a-f-]{36}$/.test(params.id)
			? await findConversation(db, params.id, visitor)
			: null;
	if (!conversation) error(404, 'Conversa não encontrada.');
	return {
		id: conversation.id,
		title: conversation.title,
		messages: redactMessages(await loadMessages<ConsultaMessage>(db, conversation.id))
	};
};
