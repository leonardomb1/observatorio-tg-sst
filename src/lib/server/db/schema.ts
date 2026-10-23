import { sql } from 'drizzle-orm';
import {
	bigint,
	bigserial,
	boolean,
	customType,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	vector
} from 'drizzle-orm/pg-core';

const bytea = customType<{ data: Buffer }>({ dataType: () => 'bytea' });
const tsvector = customType<{ data: string }>({ dataType: () => 'tsvector' });

export const documentKind = pgEnum('document_kind', ['nr', 'pdf', 'markdown', 'text']);

export const documentStatus = pgEnum('document_status', [
	'pending',
	'extracting',
	'chunking',
	'embedding',
	'ready',
	'failed',
	'archived'
]);

export const jobKind = pgEnum('job_kind', ['ingest', 'reembed', 'import_nr']);
export const jobState = pgEnum('job_state', ['queued', 'running', 'done', 'failed', 'cancelled']);

export const documents = pgTable('documents', {
	id: uuid('id').primaryKey().defaultRandom(),
	slug: text('slug').notNull().unique(),
	title: text('title').notNull(),
	kind: documentKind('kind').notNull(),
	collection: text('collection').notNull().default('geral'),
	sourceUrl: text('source_url'),
	currentVersionId: uuid('current_version_id'),
	status: documentStatus('status').notNull().default('pending'),
	citable: boolean('citable').notNull().default(true),
	meta: jsonb('meta').$type<Record<string, unknown>>().notNull().default({}),
	createdBy: text('created_by'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const documentVersions = pgTable(
	'document_versions',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		documentId: uuid('document_id')
			.notNull()
			.references(() => documents.id, { onDelete: 'cascade' }),
		version: integer('version').notNull(),
		sourceSha256: text('source_sha256').notNull(),
		filename: text('filename'),
		mimeType: text('mime_type'),
		byteSize: integer('byte_size'),
		extractedText: text('extracted_text'),
		pageCount: integer('page_count'),
		ocrPages: integer('ocr_pages').notNull().default(0),
		extractor: text('extractor'),
		chunker: text('chunker'),
		status: documentStatus('status').notNull().default('pending'),
		error: text('error'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [uniqueIndex('document_versions_document_version').on(table.documentId, table.version)]
);

export const documentFiles = pgTable('document_files', {
	versionId: uuid('version_id')
		.primaryKey()
		.references(() => documentVersions.id, { onDelete: 'cascade' }),
	bytes: bytea('bytes').notNull()
});

export const chunks = pgTable(
	'chunks',
	{
		id: bigserial('id', { mode: 'number' }).primaryKey(),
		versionId: uuid('version_id')
			.notNull()
			.references(() => documentVersions.id, { onDelete: 'cascade' }),
		documentId: uuid('document_id')
			.notNull()
			.references(() => documents.id, { onDelete: 'cascade' }),
		seq: integer('seq').notNull(),
		trail: text('trail').notNull().default(''),
		itemCode: text('item_code'),
		parentCode: text('parent_code'),
		pageStart: integer('page_start'),
		pageEnd: integer('page_end'),
		blocks: jsonb('blocks').$type<string[]>().notNull(),
		content: text('content').notNull(),
		contentHash: text('content_hash').notNull(),
		tsv: tsvector('tsv').generatedAlwaysAs(
			sql`setweight(to_tsvector('public.pt_unaccent'::regconfig, coalesce(item_code, '') || ' ' || trail), 'A') || setweight(to_tsvector('public.pt_unaccent'::regconfig, content), 'B')`
		)
	},
	(table) => [
		uniqueIndex('chunks_version_seq').on(table.versionId, table.seq),
		index('chunks_document').on(table.documentId),
		index('chunks_item_code').on(table.itemCode),
		index('chunks_content_hash').on(table.contentHash),
		index('chunks_tsv').using('gin', table.tsv)
	]
);

export const chunkEmbeddings = pgTable(
	'chunk_embeddings',
	{
		chunkId: bigint('chunk_id', { mode: 'number' })
			.notNull()
			.references(() => chunks.id, { onDelete: 'cascade' }),
		model: text('model').notNull(),
		contentHash: text('content_hash').notNull(),
		embedding: vector('embedding', { dimensions: 1024 }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		primaryKey({ columns: [table.chunkId, table.model] }),
		index('chunk_embeddings_voyage4_hnsw')
			.using('hnsw', table.embedding.op('vector_cosine_ops'))
			.where(sql`model = 'voyage-4@1024'`)
	]
);

export const ingestJobs = pgTable(
	'ingest_jobs',
	{
		id: bigserial('id', { mode: 'number' }).primaryKey(),
		kind: jobKind('kind').notNull(),
		documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }),
		versionId: uuid('version_id').references(() => documentVersions.id, { onDelete: 'cascade' }),
		state: jobState('state').notNull().default('queued'),
		stage: text('stage'),
		progress: integer('progress').notNull().default(0),
		total: integer('total'),
		attempts: integer('attempts').notNull().default(0),
		runAfter: timestamp('run_after', { withTimezone: true }).notNull().defaultNow(),
		lockedBy: text('locked_by'),
		lockedAt: timestamp('locked_at', { withTimezone: true }),
		error: text('error'),
		usageTokens: integer('usage_tokens').notNull().default(0),
		createdBy: text('created_by'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		finishedAt: timestamp('finished_at', { withTimezone: true })
	},
	(table) => [index('ingest_jobs_claim').on(table.state, table.runAfter)]
);

export const ragSettings = pgTable('rag_settings', {
	key: text('key').primaryKey(),
	value: jsonb('value').notNull()
});

export const retrievalLog = pgTable('retrieval_log', {
	id: bigserial('id', { mode: 'number' }).primaryKey(),
	query: text('query').notNull(),
	embeddingModel: text('embedding_model'),
	rerankModel: text('rerank_model'),
	results: jsonb('results').notNull(),
	latencyMs: integer('latency_ms'),
	source: text('source').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const sessions = pgTable(
	'sessions',
	{
		id: text('id').primaryKey(),
		subject: text('subject').notNull(),
		username: text('username').notNull(),
		email: text('email'),
		groups: jsonb('groups').$type<string[]>().notNull().default([]),
		idToken: text('id_token'),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [index('sessions_expires').on(table.expiresAt)]
);

export const conversations = pgTable(
	'conversations',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		subject: text('subject').notNull(),
		title: text('title'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [index('conversations_subject').on(table.subject, table.updatedAt)]
);

/** Append-only: preserved thinking rejects a history whose earlier turns were edited. */
export const conversationMessages = pgTable(
	'conversation_messages',
	{
		id: text('id').primaryKey(),
		conversationId: uuid('conversation_id')
			.notNull()
			.references(() => conversations.id, { onDelete: 'cascade' }),
		seq: integer('seq').notNull(),
		role: text('role').notNull(),
		message: jsonb('message').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [uniqueIndex('conversation_messages_seq').on(table.conversationId, table.seq)]
);

export const assistantUsage = pgTable(
	'assistant_usage',
	{
		id: bigserial('id', { mode: 'number' }).primaryKey(),
		subject: text('subject').notNull(),
		conversationId: uuid('conversation_id').references(() => conversations.id, {
			onDelete: 'set null'
		}),
		model: text('model').notNull(),
		inputTokens: integer('input_tokens').notNull().default(0),
		outputTokens: integer('output_tokens').notNull().default(0),
		cacheReadTokens: integer('cache_read_tokens').notNull().default(0),
		cacheWriteTokens: integer('cache_write_tokens').notNull().default(0),
		steps: integer('steps').notNull().default(0),
		finishReason: text('finish_reason'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [index('assistant_usage_subject').on(table.subject, table.createdAt)]
);
