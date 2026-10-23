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
import {
	assistantDeps,
	assistantModel,
	connectionDaily,
	dailyQuestions,
	globalDaily
} from '#lib/server/assistant/context.ts';
import { countConnection } from '#lib/server/assistant/limits.ts';
import { visitorSubject } from '#lib/server/assistant/visitor.ts';
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

export const POST: RequestHandler = async ({ cookies, getClientAddress, params, request, url }) => {
	const subject = visitorSubject(cookies, url);
	if (!assistantModel) return refuse(503, 'O assistente ainda não está configurado.');
	const conversation = /^[0-9a-f-]{36}$/.test(params.id)
		? await findConversation(db, params.id, subject)
		: null;
	if (!conversation) return refuse(404, 'Conversa não encontrada.');
	const body = Body.safeParse(await request.json());
	if (!body.success) return refuse(400, 'Pergunta inválida.');
	if ((await questionsToday(db)) >= globalDaily) {
		return refuse(429, 'A consulta atingiu o limite diário do observatório. Volte amanhã.');
	}
	if ((await questionsToday(db, subject)) >= dailyQuestions) {
		return refuse(
			429,
			`Você já fez ${dailyQuestions} perguntas hoje. O limite volta à meia-noite.`
		);
	}
	if (countConnection(getClientAddress()) > connectionDaily) {
		return refuse(429, 'Muitas perguntas desta rede hoje. O limite volta à meia-noite.');
	}

	const history = await loadMessages(db, conversation.id);
	const usageId = await openUsage(db, {
		subject,
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
