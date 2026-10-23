import * as z from 'zod';
import { deleteConversation, renameConversation } from '#lib/server/assistant/conversations.ts';
import { readVisitor } from '#lib/server/assistant/visitor.ts';
import { db } from '#lib/server/db/index.ts';
import type { RequestHandler } from './$types';

const Rename = z.object({ title: z.string().trim().min(1).max(120) });
const UUID = /^[0-9a-f-]{36}$/;
const notFound = () => Response.json({ message: 'Conversa não encontrada.' }, { status: 404 });

export const PATCH: RequestHandler = async ({ cookies, params, request }) => {
	const visitor = readVisitor(cookies);
	const body = Rename.safeParse(await request.json());
	if (!body.success) return Response.json({ message: 'Nome inválido.' }, { status: 400 });
	if (!visitor || !UUID.test(params.id)) return notFound();
	return (await renameConversation(db, params.id, visitor, body.data.title))
		? new Response(null, { status: 204 })
		: notFound();
};

export const DELETE: RequestHandler = async ({ cookies, params }) => {
	const visitor = readVisitor(cookies);
	if (!visitor || !UUID.test(params.id)) return notFound();
	return (await deleteConversation(db, params.id, visitor))
		? new Response(null, { status: 204 })
		: notFound();
};
