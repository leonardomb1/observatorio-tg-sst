import * as z from 'zod';
import { TERMS_VERSION } from '#lib/contact.ts';
import { recordConsent, verifyTurnstile } from '#lib/server/assistant/consent.ts';
import { turnstile } from '#lib/server/assistant/context.ts';
import { findActiveEvent, normalizeCode } from '#lib/server/assistant/events.ts';
import { issueVisitor } from '#lib/server/assistant/visitor.ts';
import { db } from '#lib/server/db/index.ts';
import type { RequestHandler } from './$types';

const Start = z.object({
	token: z.string().min(1).max(4096),
	accept: z.literal(true),
	event: z.string().max(40).optional()
});

const refuse = (status: number, message: string) => Response.json({ message }, { status });

/** The start step: terms accepted, Turnstile passed, optional event code. */
export const POST: RequestHandler = async ({ cookies, getClientAddress, request, url }) => {
	if (!turnstile) return refuse(503, 'A consulta ainda não está configurada.');
	const body = Start.safeParse(await request.json());
	if (!body.success) return refuse(400, 'Aceite os termos para começar.');

	let eventCode: string | null = null;
	if (body.data.event?.trim()) {
		const code = normalizeCode(body.data.event);
		const event = code ? await findActiveEvent(db, code) : null;
		if (!event) return refuse(400, 'Código de evento inválido ou encerrado.');
		eventCode = event.code;
	}

	const human = await verifyTurnstile(turnstile.secretKey, body.data.token, getClientAddress());
	if (!human) return refuse(403, 'A verificação não foi concluída. Tente de novo.');

	await recordConsent(db, issueVisitor(cookies, url), TERMS_VERSION, eventCode);
	return new Response(null, { status: 204 });
};
