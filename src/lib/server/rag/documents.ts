import { createHash } from 'node:crypto';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { Db } from '../db/client.ts';
import { chunks, documentFiles, documents, documentVersions, ingestJobs } from '../db/schema.ts';
import { enqueue } from './queue.ts';

export const COLLECTIONS = ['normas', 'metodologia', 'referencias', 'tese'] as const;
type Collection = (typeof COLLECTIONS)[number];
const MIME_BY_EXTENSION: Record<string, string> = {
	pdf: 'application/pdf',
	md: 'text/markdown',
	markdown: 'text/markdown',
	txt: 'text/plain'
};

function mimeOf(filename: string): string | null {
	const extension = filename.split('.').pop()?.toLowerCase() ?? '';
	return MIME_BY_EXTENSION[extension] ?? null;
}

export function slugify(text: string): string {
	return text
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 80);
}

export interface Upload {
	title: string;
	slug: string;
	collection: Collection;
	citable: boolean;
	nr: number | null;
	sourceUrl: string | null;
	filename: string;
	bytes: Uint8Array;
	createdBy: string;
}

export type UploadOutcome =
	| { kind: 'created' | 'new-version'; documentId: string }
	| { kind: 'duplicate'; documentId: string; version: number };

/** Stores the file as a new document or a new version of the one with the same slug, then queues ingestion. */
export async function uploadDocument(db: Db, upload: Upload): Promise<UploadOutcome> {
	const mimeType = mimeOf(upload.filename);
	if (!mimeType) throw new Error('Formato não suportado. Envie PDF, Markdown ou texto.');
	const sha256 = createHash('sha256').update(upload.bytes).digest('hex');

	const [existing] = await db.select().from(documents).where(eq(documents.slug, upload.slug));
	if (existing) {
		const [same] = await db
			.select({ version: documentVersions.version })
			.from(documentVersions)
			.where(
				and(eq(documentVersions.documentId, existing.id), eq(documentVersions.sourceSha256, sha256))
			);
		if (same) return { kind: 'duplicate', documentId: existing.id, version: same.version };
	}

	const outcome = await db.transaction(async (tx) => {
		const document =
			existing ??
			(
				await tx
					.insert(documents)
					.values({
						slug: upload.slug,
						title: upload.title,
						kind: upload.nr
							? 'nr'
							: mimeType === 'application/pdf'
								? 'pdf'
								: mimeType === 'text/markdown'
									? 'markdown'
									: 'text',
						collection: upload.collection,
						citable: upload.citable,
						sourceUrl: upload.sourceUrl,
						meta: upload.nr ? { nr: upload.nr } : {},
						createdBy: upload.createdBy
					})
					.returning()
			)[0];
		if (!document) throw new Error('Falha ao criar o documento.');

		const [{ next } = { next: 1 }] = await tx
			.select({ next: sql<number>`coalesce(max(${documentVersions.version}), 0) + 1` })
			.from(documentVersions)
			.where(eq(documentVersions.documentId, document.id));
		const [version] = await tx
			.insert(documentVersions)
			.values({
				documentId: document.id,
				version: next,
				sourceSha256: sha256,
				filename: upload.filename,
				mimeType,
				byteSize: upload.bytes.byteLength
			})
			.returning();
		if (!version) throw new Error('Falha ao criar a versão.');
		await tx
			.insert(documentFiles)
			.values({ versionId: version.id, bytes: Buffer.from(upload.bytes) });
		return { documentId: document.id, versionId: version.id, created: !existing };
	});

	await enqueue(db, {
		kind: 'ingest',
		documentId: outcome.documentId,
		versionId: outcome.versionId,
		createdBy: upload.createdBy
	});
	return { kind: outcome.created ? 'created' : 'new-version', documentId: outcome.documentId };
}

export async function listDocuments(db: Db) {
	return db
		.select({
			id: documents.id,
			slug: documents.slug,
			title: documents.title,
			kind: documents.kind,
			collection: documents.collection,
			status: documents.status,
			citable: documents.citable,
			updatedAt: documents.updatedAt,
			chunkCount: sql<number>`(select count(*)::int from chunks c where c.version_id = documents.current_version_id)`,
			pendingJob: sql<
				string | null
			>`(select coalesce(j.stage, 'na fila') from ingest_jobs j where j.document_id = documents.id and j.state in ('queued', 'running') order by j.id desc limit 1)`
		})
		.from(documents)
		.orderBy(documents.collection, documents.title);
}

export async function getDocument(db: Db, id: string) {
	const [document] = await db.select().from(documents).where(eq(documents.id, id));
	if (!document) return null;
	const versions = await db
		.select({
			id: documentVersions.id,
			version: documentVersions.version,
			filename: documentVersions.filename,
			byteSize: documentVersions.byteSize,
			pageCount: documentVersions.pageCount,
			ocrPages: documentVersions.ocrPages,
			extractor: documentVersions.extractor,
			chunker: documentVersions.chunker,
			status: documentVersions.status,
			error: documentVersions.error,
			createdAt: documentVersions.createdAt
		})
		.from(documentVersions)
		.where(eq(documentVersions.documentId, id))
		.orderBy(desc(documentVersions.version));
	const jobs = await db
		.select()
		.from(ingestJobs)
		.where(eq(ingestJobs.documentId, id))
		.orderBy(desc(ingestJobs.id))
		.limit(10);
	const latest = versions[0];
	const shownVersion = document.currentVersionId ?? latest?.id ?? null;
	const rows = shownVersion
		? await db
				.select({
					id: chunks.id,
					seq: chunks.seq,
					trail: chunks.trail,
					itemCode: chunks.itemCode,
					pageStart: chunks.pageStart,
					pageEnd: chunks.pageEnd,
					blocks: chunks.blocks,
					embedded: sql<boolean>`exists (select 1 from chunk_embeddings e where e.chunk_id = ${chunks.id})`
				})
				.from(chunks)
				.where(eq(chunks.versionId, shownVersion))
				.orderBy(chunks.seq)
		: [];
	return { document, versions, jobs, chunks: rows, shownVersion };
}

export async function requeue(
	db: Db,
	documentId: string,
	kind: 'ingest' | 'reembed',
	createdBy: string
) {
	const [latest] = await db
		.select({ id: documentVersions.id })
		.from(documentVersions)
		.where(eq(documentVersions.documentId, documentId))
		.orderBy(desc(documentVersions.version))
		.limit(1);
	if (!latest) throw new Error('Documento sem versões.');
	await enqueue(db, { kind, documentId, versionId: latest.id, createdBy });
}

export async function originalFile(db: Db, versionId: string) {
	const [row] = await db
		.select({
			bytes: documentFiles.bytes,
			filename: documentVersions.filename,
			mimeType: documentVersions.mimeType
		})
		.from(documentFiles)
		.innerJoin(documentVersions, eq(documentVersions.id, documentFiles.versionId))
		.where(eq(documentFiles.versionId, versionId));
	return row ?? null;
}
