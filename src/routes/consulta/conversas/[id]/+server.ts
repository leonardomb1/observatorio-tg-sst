import * as z from 'zod';
import { deleteConversation, renameConversation } from '#lib/server/assistant/conversations.ts';
import { visitorSubject } from '#lib/server/assistant/visitor.ts';
import { db } from '#lib/server/db/index.ts';
import type { RequestHandler } from './$types';

const Rename = z.object({ title: z.string().trim().min(1).max(120) });
const UUID = /^[0-9a-f-]{36}$/;

export const PATCH: RequestHandler = async ({ cookies, params, request, url }) => {
	const body = Rename.safeParse(await request.json());
	if (!UUID.test(params.id) || !body.success) {
		return Response.json({ message: 'Nome inválido.' }, { status: 400 });
	}
	const done = await renameConversation(
		db,
		params.id,
		visitorSubject(cookies, url),
		body.data.title
	);
	return done
		? new Response(null, { status: 204 })
		: Response.json({ message: 'Conversa não encontrada.' }, { status: 404 });
};

export const DELETE: RequestHandler = async ({ cookies, params, url }) => {
	const done = UUID.test(params.id)
		? await deleteConversation(db, params.id, visitorSubject(cookies, url))
		: false;
	return done
		? new Response(null, { status: 204 })
		: Response.json({ message: 'Conversa não encontrada.' }, { status: 404 });
};
