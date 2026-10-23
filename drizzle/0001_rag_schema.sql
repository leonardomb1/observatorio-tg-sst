CREATE TYPE "public"."document_kind" AS ENUM('nr', 'pdf', 'markdown', 'text');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('pending', 'extracting', 'chunking', 'embedding', 'ready', 'failed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."job_kind" AS ENUM('ingest', 'reembed', 'import_nr');--> statement-breakpoint
CREATE TYPE "public"."job_state" AS ENUM('queued', 'running', 'done', 'failed', 'cancelled');--> statement-breakpoint
CREATE TABLE "chunk_embeddings" (
	"chunk_id" bigint NOT NULL,
	"model" text NOT NULL,
	"content_hash" text NOT NULL,
	"embedding" vector(1024) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chunk_embeddings_chunk_id_model_pk" PRIMARY KEY("chunk_id","model")
);
--> statement-breakpoint
CREATE TABLE "chunks" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"version_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"trail" text DEFAULT '' NOT NULL,
	"item_code" text,
	"parent_code" text,
	"page_start" integer,
	"page_end" integer,
	"blocks" jsonb NOT NULL,
	"content" text NOT NULL,
	"content_hash" text NOT NULL,
	"tsv" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('public.pt_unaccent'::regconfig, coalesce(item_code, '') || ' ' || trail), 'A') || setweight(to_tsvector('public.pt_unaccent'::regconfig, content), 'B')) STORED
);
--> statement-breakpoint
CREATE TABLE "document_files" (
	"version_id" uuid PRIMARY KEY NOT NULL,
	"bytes" "bytea" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"source_sha256" text NOT NULL,
	"filename" text,
	"mime_type" text,
	"byte_size" integer,
	"extracted_text" text,
	"page_count" integer,
	"ocr_pages" integer DEFAULT 0 NOT NULL,
	"extractor" text,
	"chunker" text,
	"status" "document_status" DEFAULT 'pending' NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"kind" "document_kind" NOT NULL,
	"collection" text DEFAULT 'geral' NOT NULL,
	"source_url" text,
	"current_version_id" uuid,
	"status" "document_status" DEFAULT 'pending' NOT NULL,
	"citable" boolean DEFAULT true NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "documents_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "ingest_jobs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"kind" "job_kind" NOT NULL,
	"document_id" uuid,
	"version_id" uuid,
	"state" "job_state" DEFAULT 'queued' NOT NULL,
	"stage" text,
	"progress" integer DEFAULT 0 NOT NULL,
	"total" integer,
	"attempts" integer DEFAULT 0 NOT NULL,
	"run_after" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_by" text,
	"locked_at" timestamp with time zone,
	"error" text,
	"usage_tokens" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rag_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "retrieval_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"query" text NOT NULL,
	"embedding_model" text,
	"rerank_model" text,
	"results" jsonb NOT NULL,
	"latency_ms" integer,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"subject" text NOT NULL,
	"username" text NOT NULL,
	"email" text,
	"groups" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"id_token" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chunk_embeddings" ADD CONSTRAINT "chunk_embeddings_chunk_id_chunks_id_fk" FOREIGN KEY ("chunk_id") REFERENCES "public"."chunks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_version_id_document_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."document_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_files" ADD CONSTRAINT "document_files_version_id_document_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."document_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingest_jobs" ADD CONSTRAINT "ingest_jobs_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingest_jobs" ADD CONSTRAINT "ingest_jobs_version_id_document_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."document_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chunk_embeddings_voyage4_hnsw" ON "chunk_embeddings" USING hnsw ("embedding" vector_cosine_ops) WHERE model = 'voyage-4@1024';--> statement-breakpoint
CREATE UNIQUE INDEX "chunks_version_seq" ON "chunks" USING btree ("version_id","seq");--> statement-breakpoint
CREATE INDEX "chunks_document" ON "chunks" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "chunks_item_code" ON "chunks" USING btree ("item_code");--> statement-breakpoint
CREATE INDEX "chunks_content_hash" ON "chunks" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "chunks_tsv" ON "chunks" USING gin ("tsv");--> statement-breakpoint
CREATE UNIQUE INDEX "document_versions_document_version" ON "document_versions" USING btree ("document_id","version");--> statement-breakpoint
CREATE INDEX "ingest_jobs_claim" ON "ingest_jobs" USING btree ("state","run_after");--> statement-breakpoint
CREATE INDEX "sessions_expires" ON "sessions" USING btree ("expires_at");