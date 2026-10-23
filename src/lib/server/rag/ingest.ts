import { and, eq, isNull, sql } from 'drizzle-orm';
import type { Db } from '../db/client.ts';
import {
	chunkEmbeddings,
	chunks,
	documentFiles,
	documents,
	documentVersions
} from '../db/schema.ts';
import type { Chunk } from './chunk.ts';
import { extract } from './extract.ts';
import { detectNrNumber, parseNr } from './nr.ts';
import { chunkProse } from './prose.ts';
import { complete, report, type Job } from './queue.ts';
import { embed, EMBEDDING_TAG, type VoyageConfig } from './voyage.ts';

export interface IngestContext {
	db: Db;
	voyage: VoyageConfig | null;
}

const EMBED_PAGE = 128;

async function setStatus(
	db: Db,
	documentId: string,
	versionId: string,
	status: typeof documents.$inferSelect.status
) {
	await db.update(documentVersions).set({ status }).where(eq(documentVersions.id, versionId));
	await db
		.update(documents)
		.set({ status, updatedAt: new Date() })
		.where(and(eq(documents.id, documentId), isNull(documents.currentVersionId)));
}

function chunkText(
	document: typeof documents.$inferSelect,
	pages: { number: number | null; text: string }[]
): { chunks: Chunk[]; chunker: string } {
	if (document.kind === 'nr') {
		const text = pages.map((page) => page.text).join('\n');
		const nr = Number(document.meta.nr) || detectNrNumber(text);
		if (!nr) throw new Error('Não foi possível identificar o número da NR no texto.');
		return { chunks: parseNr(nr, text).chunks, chunker: 'nr-item@1' };
	}
	return { chunks: chunkProse(document.title, pages), chunker: 'prose-heading@1' };
}

/** Embeds every chunk of a version that has no vector for the active model, reusing equal content. */
async function embedMissing(ctx: IngestContext, job: Job, versionId: string): Promise<number> {
	const { db } = ctx;
	await db.execute(sql`
		insert into chunk_embeddings (chunk_id, model, content_hash, embedding)
		select distinct on (c.id) c.id, e.model, e.content_hash, e.embedding
		from chunks c
		join chunk_embeddings e on e.content_hash = c.content_hash and e.model = ${EMBEDDING_TAG}
		where c.version_id = ${versionId}
		on conflict do nothing`);

	const pending = await db
		.select({ id: chunks.id, content: chunks.content, contentHash: chunks.contentHash })
		.from(chunks)
		.leftJoin(
			chunkEmbeddings,
			and(eq(chunkEmbeddings.chunkId, chunks.id), eq(chunkEmbeddings.model, EMBEDDING_TAG))
		)
		.where(and(eq(chunks.versionId, versionId), isNull(chunkEmbeddings.chunkId)))
		.orderBy(chunks.seq);

	if (pending.length === 0) return 0;
	if (!ctx.voyage)
		throw new Error('VOYAGE_API_KEY não configurada: os trechos não podem ser vetorizados.');

	let tokens = 0;
	for (let offset = 0; offset < pending.length; offset += EMBED_PAGE) {
		const page = pending.slice(offset, offset + EMBED_PAGE);
		const result = await embed(
			ctx.voyage,
			page.map((chunk) => chunk.content),
			'document'
		);
		tokens += result.tokens;
		await db
			.insert(chunkEmbeddings)
			.values(
				page.map((chunk, index) => ({
					chunkId: chunk.id,
					model: EMBEDDING_TAG,
					contentHash: chunk.contentHash,
					embedding: result.vectors[index] ?? []
				}))
			)
			.onConflictDoNothing();
		await report(db, job.id, 'embedding', offset + page.length, pending.length);
	}
	return tokens;
}

async function publish(db: Db, documentId: string, versionId: string) {
	await db.transaction(async (tx) => {
		await tx
			.update(documentVersions)
			.set({ status: 'ready' })
			.where(eq(documentVersions.id, versionId));
		await tx
			.update(documents)
			.set({ currentVersionId: versionId, status: 'ready', updatedAt: new Date() })
			.where(eq(documents.id, documentId));
	});
}

async function ingestVersion(ctx: IngestContext, job: Job): Promise<number> {
	const { db } = ctx;
	if (!job.versionId || !job.documentId) throw new Error('Tarefa de ingestão sem versão.');
	const versionId = job.versionId;
	const documentId = job.documentId;

	const [row] = await db
		.select({ document: documents, version: documentVersions, bytes: documentFiles.bytes })
		.from(documentVersions)
		.innerJoin(documents, eq(documents.id, documentVersions.documentId))
		.innerJoin(documentFiles, eq(documentFiles.versionId, documentVersions.id))
		.where(eq(documentVersions.id, versionId));
	if (!row) throw new Error(`Versão ${versionId} não encontrada.`);

	await setStatus(db, documentId, versionId, 'extracting');
	await report(db, job.id, 'extract');
	const extraction = await extract(new Uint8Array(row.bytes), row.version.mimeType ?? 'text/plain');

	await setStatus(db, documentId, versionId, 'chunking');
	await report(db, job.id, 'chunk');
	const { chunks: parsed, chunker } = chunkText(row.document, extraction.pages);
	if (parsed.length === 0) throw new Error('Nenhum texto aproveitável foi extraído do arquivo.');

	await db.transaction(async (tx) => {
		await tx.delete(chunks).where(eq(chunks.versionId, versionId));
		await tx.insert(chunks).values(
			parsed.map((chunk) => ({
				versionId,
				documentId,
				seq: chunk.seq,
				trail: chunk.trail,
				itemCode: chunk.itemCode,
				parentCode: chunk.parentCode,
				pageStart: chunk.pageStart,
				pageEnd: chunk.pageEnd,
				blocks: chunk.blocks,
				content: chunk.content,
				contentHash: chunk.contentHash
			}))
		);
		await tx
			.update(documentVersions)
			.set({
				extractedText: extraction.pages.map((page) => page.text).join('\n\f\n'),
				pageCount: extraction.pages.length,
				ocrPages: extraction.ocrPages,
				extractor: extraction.extractor,
				chunker,
				error: null
			})
			.where(eq(documentVersions.id, versionId));
	});

	await setStatus(db, documentId, versionId, 'embedding');
	const tokens = await embedMissing(ctx, job, versionId);
	await publish(db, documentId, versionId);
	return tokens;
}

async function reembed(ctx: IngestContext, job: Job): Promise<number> {
	if (!job.documentId) throw new Error('Tarefa sem documento.');
	const [document] = await ctx.db.select().from(documents).where(eq(documents.id, job.documentId));
	if (!document?.currentVersionId) throw new Error('Documento sem versão publicada.');
	return embedMissing(ctx, job, document.currentVersionId);
}

export async function runJob(ctx: IngestContext, job: Job): Promise<void> {
	const tokens = job.kind === 'reembed' ? await reembed(ctx, job) : await ingestVersion(ctx, job);
	await complete(ctx.db, job.id, tokens);
}

/** Marks the version failed so the admin sees why, keeping the previous version searchable. */
export async function markFailed(db: Db, job: Job, error: unknown): Promise<void> {
	if (!job.versionId) return;
	const message = error instanceof Error ? error.message : String(error);
	await db
		.update(documentVersions)
		.set({ status: 'failed', error: message.slice(0, 4000) })
		.where(eq(documentVersions.id, job.versionId));
	if (job.documentId) {
		await db
			.update(documents)
			.set({ status: 'failed', updatedAt: new Date() })
			.where(and(eq(documents.id, job.documentId), isNull(documents.currentVersionId)));
	}
}
