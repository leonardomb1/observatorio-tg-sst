import { fail, redirect } from '@sveltejs/kit';
import * as z from 'zod';
import { db } from '#lib/server/db/index.ts';
import { COLLECTIONS, listDocuments, slugify, uploadDocument } from '#lib/server/rag/documents.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({ documents: await listDocuments(db) });

const UploadForm = z.object({
	title: z.string().trim().min(3, 'Informe um título.'),
	slug: z.string().trim().optional(),
	collection: z.enum(COLLECTIONS),
	citable: z.literal('on').optional(),
	nr: z
		.string()
		.optional()
		.transform((value) => (value ? Number(value) : null))
		.pipe(z.number().int().min(1).max(40).nullable()),
	sourceUrl: z
		.url()
		.optional()
		.or(z.literal('').transform(() => undefined))
});

const MAX_BYTES = 50 * 1024 * 1024;

export const actions: Actions = {
	enviar: async ({ request, locals }) => {
		const form = await request.formData();
		const file = form.get('arquivo');
		const parsed = UploadForm.safeParse(Object.fromEntries(form));
		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues[0]?.message ?? 'Formulário inválido.' });
		}
		if (!(file instanceof File) || file.size === 0)
			return fail(400, { error: 'Escolha um arquivo.' });
		if (file.size > MAX_BYTES) return fail(400, { error: 'O arquivo passa de 50 MB.' });

		const { title, slug, collection, citable, nr, sourceUrl } = parsed.data;
		let outcome;
		try {
			outcome = await uploadDocument(db, {
				title,
				slug: slug ? slugify(slug) : nr ? `nr-${nr}` : slugify(title),
				collection,
				citable: citable === 'on',
				nr,
				sourceUrl: sourceUrl ?? null,
				filename: file.name,
				bytes: new Uint8Array(await file.arrayBuffer()),
				createdBy: locals.admin?.username ?? 'desconhecido'
			});
		} catch (error) {
			return fail(400, { error: error instanceof Error ? error.message : String(error) });
		}
		if (outcome.kind === 'duplicate') {
			return fail(409, {
				error: `Este arquivo já é a versão ${outcome.version} do documento.`,
				documentId: outcome.documentId
			});
		}
		redirect(303, `/admin/documentos/${outcome.documentId}`);
	}
};
