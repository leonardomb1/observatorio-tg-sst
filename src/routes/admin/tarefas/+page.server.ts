import { desc, eq, inArray } from 'drizzle-orm';
import { db } from '#lib/server/db/index.ts';
import { documents, ingestJobs } from '#lib/server/db/schema.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({
	jobs: await db
		.select({
			id: ingestJobs.id,
			kind: ingestJobs.kind,
			state: ingestJobs.state,
			stage: ingestJobs.stage,
			progress: ingestJobs.progress,
			total: ingestJobs.total,
			attempts: ingestJobs.attempts,
			error: ingestJobs.error,
			usageTokens: ingestJobs.usageTokens,
			createdAt: ingestJobs.createdAt,
			finishedAt: ingestJobs.finishedAt,
			documentId: ingestJobs.documentId,
			title: documents.title
		})
		.from(ingestJobs)
		.leftJoin(documents, eq(documents.id, ingestJobs.documentId))
		.orderBy(desc(ingestJobs.id))
		.limit(100)
});

function jobId(form: FormData): number {
	return Number(form.get('id'));
}

export const actions: Actions = {
	repetir: async ({ request }) => {
		await db
			.update(ingestJobs)
			.set({ state: 'queued', attempts: 0, runAfter: new Date(), error: null, finishedAt: null })
			.where(eq(ingestJobs.id, jobId(await request.formData())));
		return { message: 'Tarefa recolocada na fila.' };
	},
	cancelar: async ({ request }) => {
		await db
			.update(ingestJobs)
			.set({ state: 'cancelled', finishedAt: new Date() })
			.where(eq(ingestJobs.id, jobId(await request.formData())));
		return { message: 'Tarefa cancelada.' };
	},
	limpar: async () => {
		await db.delete(ingestJobs).where(inArray(ingestJobs.state, ['done', 'cancelled']));
		return { message: 'Tarefas concluídas removidas.' };
	}
};
