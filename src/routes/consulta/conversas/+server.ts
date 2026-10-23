import { allowance } from '#lib/server/assistant/allowance.ts';
import { allowanceSettings } from '#lib/server/assistant/context.ts';
import { createConversation } from '#lib/server/assistant/conversations.ts';
import { readVisitor } from '#lib/server/assistant/visitor.ts';
import { db } from '#lib/server/db/index.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	const visitor = readVisitor(cookies);
	if (!visitor || !(await allowance(db, visitor, allowanceSettings)).started) {
		return Response.json({ message: 'Comece pela etapa de aceite.' }, { status: 403 });
	}
	return Response.json({ id: await createConversation(db, visitor) }, { status: 201 });
};
