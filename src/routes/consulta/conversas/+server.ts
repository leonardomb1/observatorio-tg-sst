import { createConversation } from '#lib/server/assistant/conversations.ts';
import { visitorSubject } from '#lib/server/assistant/visitor.ts';
import { db } from '#lib/server/db/index.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies, url }) => {
	const id = await createConversation(db, visitorSubject(cookies, url));
	return Response.json({ id }, { status: 201 });
};
