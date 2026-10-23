import { fail } from '@sveltejs/kit';
import { renderSVG } from 'uqr';
import * as z from 'zod';
import { PUBLIC_ORIGIN } from '$app/env/private';
import { EVENT_DURATIONS, type EventDuration } from '#lib/admin.ts';
import {
	codeFrom,
	createEvent,
	listEvents,
	normalizeCode,
	revokeEvent
} from '#lib/server/assistant/events.ts';
import { db } from '#lib/server/db/index.ts';
import type { Actions, PageServerLoad } from './$types';

const EventForm = z.object({
	label: z.string().trim().min(3, 'Dê um nome ao evento.').max(80),
	code: z.string().trim().max(32).optional(),
	duration: z.enum(Object.keys(EVENT_DURATIONS) as [EventDuration]),
	pool: z.coerce.number().int().min(1, 'O total precisa ser positivo.').max(100_000),
	perVisitor: z.coerce.number().int().min(1).max(500)
});

export const load: PageServerLoad = async ({ url }) => {
	const origin = PUBLIC_ORIGIN ?? url.origin;
	const events = await listEvents(db);
	return {
		events: events.map((event) => {
			const link = `${origin}/consulta?evento=${event.code}`;
			return { ...event, link, qr: renderSVG(link, { pixelSize: 4 }) };
		})
	};
};

export const actions: Actions = {
	criar: async ({ request, locals }) => {
		const parsed = EventForm.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues[0]?.message ?? 'Formulário inválido.' });
		}
		const { label, code, duration, pool, perVisitor } = parsed.data;
		const chosen = code ? normalizeCode(code) : codeFrom(label);
		if (!chosen) {
			return fail(400, { error: 'Use de 4 a 32 letras, números ou hífens no código.' });
		}
		const startsAt = new Date();
		try {
			await createEvent(db, {
				code: chosen,
				label,
				startsAt,
				endsAt: new Date(startsAt.getTime() + EVENT_DURATIONS[duration].hours * 3_600_000),
				questionPool: pool,
				perVisitor: Math.min(perVisitor, pool),
				createdBy: locals.admin?.username ?? 'desconhecido'
			});
		} catch {
			return fail(409, { error: `Já existe um evento com o código ${chosen}.` });
		}
		return { created: chosen };
	},
	encerrar: async ({ request }) => {
		const raw = (await request.formData()).get('code');
		const code = typeof raw === 'string' ? normalizeCode(raw) : null;
		if (code) await revokeEvent(db, code);
	}
};
