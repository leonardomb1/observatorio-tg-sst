import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { documents } from '#lib/server/db/schema.ts';
import { getDocument, requeue } from '#lib/server/rag/documents.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const detail = await getDocument(db, params.id);
	if (!detail) error(404, 'Documento não encontrado.');
	return detail;
};

export const actions: Actions = {
	reprocessar: async ({ params, locals }) => {
		await requeue(db, params.id, 'ingest', locals.admin?.username ?? 'desconhecido');
		return { message: 'Reprocessamento enfileirado.' };
	},
	revetorizar: async ({ params, locals }) => {
		await requeue(db, params.id, 'reembed', locals.admin?.username ?? 'desconhecido');
		return { message: 'Vetorização enfileirada.' };
	},
	citavel: async ({ params, request }) => {
		const citable = (await request.formData()).get('citable') === 'true';
		await db
			.update(documents)
			.set({ citable, updatedAt: new Date() })
			.where(eq(documents.id, params.id));
		return {
			message: citable
				? 'O assistente pode citar este documento.'
				: 'Documento retirado das citações.'
		};
	},
	arquivar: async ({ params, request }) => {
		const archive = (await request.formData()).get('archive') === 'true';
		const [document] = await db.select().from(documents).where(eq(documents.id, params.id));
		if (!document) return fail(404, { message: 'Documento não encontrado.' });
		const status = archive ? 'archived' : document.currentVersionId ? 'ready' : 'pending';
		await db
			.update(documents)
			.set({ status, updatedAt: new Date() })
			.where(eq(documents.id, params.id));
		return { message: archive ? 'Documento arquivado.' : 'Documento restaurado.' };
	},
	excluir: async ({ params }) => {
		await db.delete(documents).where(eq(documents.id, params.id));
		redirect(303, '/admin/documentos');
	}
};
