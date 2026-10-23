CREATE TABLE "assistant_consents" (
	"visitor_id" text NOT NULL,
	"terms_version" text NOT NULL,
	"event_code" text,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assistant_consents_visitor_id_terms_version_pk" PRIMARY KEY("visitor_id","terms_version")
);
--> statement-breakpoint
CREATE TABLE "event_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"question_pool" integer NOT NULL,
	"per_visitor" integer NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "assistant_usage" ADD COLUMN "event_code" text;--> statement-breakpoint
ALTER TABLE "assistant_consents" ADD CONSTRAINT "assistant_consents_event_code_event_codes_code_fk" FOREIGN KEY ("event_code") REFERENCES "public"."event_codes"("code") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assistant_usage" ADD CONSTRAINT "assistant_usage_event_code_event_codes_code_fk" FOREIGN KEY ("event_code") REFERENCES "public"."event_codes"("code") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assistant_usage_event" ON "assistant_usage" USING btree ("event_code");