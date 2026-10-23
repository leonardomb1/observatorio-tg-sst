import * as z from 'zod';
import { TERMS_VERSION } from '#lib/contact.ts';
import { findConsent, recordConsent } from '#lib/server/assistant/consent.ts';
import { findActiveEvent, normalizeCode } from '#lib/server/assistant/events.ts';
import { addressKey, withinBurst } from '#lib/server/assistant/limits.ts';
import { readVisitor } from '#lib/server/assistant/visitor.ts';
import { db } from '#lib/server/db/index.ts';
import type { RequestHandler } from './$types';

const Body = z.object({ code: z.string().max(40) });
const ATTEMPTS_PER_MINUTE = 30;

/** Joins an event after the start step, e.g. when the QR code is scanned later. */
export const POST: RequestHandler = async ({ cookies, request, getClientAddress }) => {
	if (!withinBurst(`evento:${addressKey(getClientAddress())}`, ATTEMPTS_PER_MINUTE)) {
		return Response.json(
			{ message: 'Muitas tentativas. Aguarde um minuto e tente de novo.' },
			{ status: 429 }
		);
	}
	const visitor = readVisitor(cookies);
	const body = Body.safeParse(await request.json());
	if (!visitor || !(await findConsent(db, visitor, TERMS_VERSION))) {
		return Response.json({ message: 'Comece pela etapa de aceite.' }, { status: 403 });
	}
	const code = body.success ? normalizeCode(body.data.code) : null;
	const event = code ? await findActiveEvent(db, code) : null;
	if (!event) {
		return Response.json({ message: 'Código de evento inválido ou encerrado.' }, { status: 400 });
	}
	await recordConsent(db, visitor, TERMS_VERSION, event.code);
	return new Response(null, { status: 204 });
};
