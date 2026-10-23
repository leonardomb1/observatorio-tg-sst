import { generateId } from 'ai';
import * as z from 'zod';
import { runAgent, MODEL } from '#lib/server/assistant/agent.ts';
import { allowance } from '#lib/server/assistant/allowance.ts';
import {
	allowanceSettings,
	assistantDeps,
	assistantModel,
	eventPerMinute,
	perMinute
} from '#lib/server/assistant/context.ts';
import {
	appendMessages,
	closeUsage,
	findConversation,
	loadMessages,
	openUsage,
	truncateFrom
} from '#lib/server/assistant/conversations.ts';
import { addressKey, withinBurst } from '#lib/server/assistant/limits.ts';
import { readVisitor } from '#lib/server/assistant/visitor.ts';
import { db } from '#lib/server/db/index.ts';
import type { RequestHandler } from './$types';

const Body = z.object({
	message: z.object({
		role: z.literal('user'),
		parts: z
			.array(z.object({ type: z.literal('text'), text: z.string().trim().min(1).max(4000) }))
			.length(1)
	}),
	/** Present when a question is rewritten: how many earlier messages to keep. */
	keep: z.number().int().min(0).optional()
});

const refuse = (status: number, message: string) => Response.json({ message }, { status });

export const POST: RequestHandler = async ({ cookies, getClientAddress, params, request }) => {
	if (!assistantModel) return refuse(503, 'O assistente ainda não está configurado.');
	const visitor = readVisitor(cookies);
	const conversation =
		visitor && /^[0-9a-f-]{36}$/.test(params.id)
			? await findConversation(db, params.id, visitor)
			: null;
	if (!visitor || !conversation) return refuse(404, 'Conversa não encontrada.');
	const body = Body.safeParse(await request.json());
	if (!body.success) return refuse(400, 'Pergunta inválida.');

	const allowed = await allowance(db, visitor, allowanceSettings);
	if (!allowed.started) return refuse(403, 'Comece pela etapa de aceite.');
	if (!allowed.event && allowed.paused) {
		return refuse(429, 'A consulta atingiu o limite de hoje. Ela volta à meia-noite.');
	}
	if (allowed.remaining <= 0) {
		return refuse(
			429,
			allowed.event
				? 'Você usou as perguntas deste código de evento.'
				: 'Você usou as perguntas de hoje. O limite volta à meia-noite.'
		);
	}
	const burst = allowed.event
		? withinBurst(`evento:${allowed.event.code}`, eventPerMinute)
		: withinBurst(addressKey(getClientAddress()), perMinute);
	if (!burst) return refuse(429, 'Muitas perguntas em pouco tempo. Aguarde um minuto.');

	let history = await loadMessages(db, conversation.id);
	const keep = body.data.keep;
	if (keep !== undefined) {
		if (keep >= history.length || history[keep]?.role !== 'user') {
			return refuse(409, 'A conversa mudou. Recarregue a página para editar a pergunta.');
		}
		await truncateFrom(db, conversation.id, keep);
		history = history.slice(0, keep);
	}
	const usageId = await openUsage(db, {
		subject: visitor,
		conversationId: conversation.id,
		model: MODEL,
		eventCode: allowed.event?.code ?? null
	});

	return runAgent(assistantModel, assistantDeps, {
		history,
		message: { id: generateId(), role: 'user', parts: body.data.message.parts },
		signal: request.signal,
		effort: allowed.effort,
		onMessages: async (messages, complete) => {
			const kept = complete ? messages : messages.slice(0, history.length + 1);
			await appendMessages(db, conversation.id, history.length, kept);
		},
		onTotals: (totals) => closeUsage(db, usageId, totals)
	});
};
