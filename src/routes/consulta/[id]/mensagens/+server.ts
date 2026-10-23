import { generateId } from 'ai';
import * as z from 'zod';
import { runAgent, MODEL } from '#lib/server/assistant/agent.ts';
import {
	appendMessages,
	closeUsage,
	findConversation,
	loadMessages,
	openUsage,
	questionsToday
} from '#lib/server/assistant/conversations.ts';
import { assistantDeps, assistantModel, dailyQuestions } from '#lib/server/assistant/context.ts';
import { db } from '#lib/server/db/index.ts';
import type { RequestHandler } from './$types';

const Body = z.object({
	message: z.object({
		role: z.literal('user'),
		parts: z
			.array(z.object({ type: z.literal('text'), text: z.string().trim().min(1).max(4000) }))
			.length(1)
	})
});

const refuse = (status: number, message: string) => Response.json({ message }, { status });

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const user = locals.user;
	if (!user) return refuse(401, 'Entre para usar a consulta.');
	if (!assistantModel) return refuse(503, 'O assistente ainda não está configurado.');
	const conversation = /^[0-9a-f-]{36}$/.test(params.id)
		? await findConversation(db, params.id, user.subject)
		: null;
	if (!conversation) return refuse(404, 'Conversa não encontrada.');
	const body = Body.safeParse(await request.json());
	if (!body.success) return refuse(400, 'Pergunta inválida.');
	if ((await questionsToday(db, user.subject)) >= dailyQuestions) {
		return refuse(
			429,
			`Você já fez ${dailyQuestions} perguntas hoje. O limite volta à meia-noite.`
		);
	}

	const history = await loadMessages(db, conversation.id);
	const usageId = await openUsage(db, {
		subject: user.subject,
		conversationId: conversation.id,
		model: MODEL
	});

	return runAgent(assistantModel, assistantDeps, {
		history,
		message: { id: generateId(), role: 'user', parts: body.data.message.parts },
		signal: request.signal,
		onMessages: async (messages, complete) => {
			const kept = complete ? messages : messages.slice(0, history.length + 1);
			await appendMessages(db, conversation.id, history.length, kept);
		},
		onTotals: (totals) => closeUsage(db, usageId, totals)
	});
};
