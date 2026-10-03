CREATE TABLE "audit_logs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"actor" varchar(200) NOT NULL,
	"action" varchar(64) NOT NULL,
	"target_type" varchar(48),
	"target_id" varchar(64),
	"run_id" varchar(36),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_idempotency" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"operation" varchar(64) NOT NULL,
	"principal" varchar(200) NOT NULL,
	"key_hash" varchar(64) NOT NULL,
	"request_hash" varchar(64) NOT NULL,
	"status" varchar(24) DEFAULT 'pending' NOT NULL,
	"result" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_run_steps" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"run_id" varchar(36) NOT NULL,
	"operation" varchar(64) NOT NULL,
	"lead_id" varchar(36),
	"status" varchar(32) NOT NULL,
	"error_code" varchar(64),
	"attempt" integer DEFAULT 1 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"result_summary" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_runs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"parent_run_id" varchar(36),
	"kind" varchar(48) NOT NULL,
	"status" varchar(32) DEFAULT 'running' NOT NULL,
	"requested_by" varchar(200) NOT NULL,
	"counters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"source_type" varchar(48) NOT NULL,
	"source_external_id" varchar(190),
	"display_name" varchar(96) NOT NULL,
	"normalized_name_key" varchar(96) NOT NULL,
	"normalized_address_key" varchar(190),
	"normalized_domain" varchar(190),
	"normalized_phone" varchar(32),
	"primary_category" varchar(64) NOT NULL,
	"city" varchar(64),
	"region" varchar(64),
	"country" varchar(64),
	"website_url" varchar(2048),
	"public_phone" varchar(32),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"business_id" varchar(36) NOT NULL,
	"channel" varchar(16) DEFAULT 'email' NOT NULL,
	"normalized_domain" varchar(190),
	"address_hash" varchar(64) NOT NULL,
	"encrypted_address" text,
	"verification_state" varchar(24) DEFAULT 'unverified' NOT NULL,
	"verified_at" timestamp with time zone,
	"provenance" varchar(48) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"business_id" varchar(36) NOT NULL,
	"status" varchar(32) NOT NULL,
	"score" integer,
	"score_reasons" jsonb,
	"outcome_reason" varchar(200),
	"previous_status" varchar(32),
	"next_action_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outreach_messages" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"lead_id" varchar(36) NOT NULL,
	"contact_id" varchar(36) NOT NULL,
	"sequence_number" integer NOT NULL,
	"kind" varchar(16) NOT NULL,
	"subject" varchar(200) NOT NULL,
	"body_text" text NOT NULL,
	"body_html" text NOT NULL,
	"status" varchar(32) DEFAULT 'prepared' NOT NULL,
	"idempotency_key_hash" varchar(64) NOT NULL,
	"provider_message_id" varchar(254),
	"prepared_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reserved_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"delivery_status" varchar(32),
	"failure_code" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poc_records" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"lead_id" varchar(36) NOT NULL,
	"slug" varchar(96) NOT NULL,
	"record" jsonb NOT NULL,
	"record_schema_version" integer NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"state" varchar(24) DEFAULT 'draft' NOT NULL,
	"qa_report" jsonb,
	"published_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poc_revisions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"poc_record_id" varchar(36) NOT NULL,
	"version" integer NOT NULL,
	"record" jsonb NOT NULL,
	"reason" varchar(200) NOT NULL,
	"changed_by" varchar(200) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reply_events" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"lead_id" varchar(36) NOT NULL,
	"message_id" varchar(36),
	"classification" varchar(24) NOT NULL,
	"classified_by" varchar(200) NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_snapshots" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"lead_id" varchar(36) NOT NULL,
	"provider" varchar(48) NOT NULL,
	"source_url" varchar(2048),
	"source_identifier" varchar(190),
	"retrieved_at" timestamp with time zone NOT NULL,
	"content_checksum" varchar(64) NOT NULL,
	"payload" jsonb NOT NULL,
	"attribution" jsonb,
	"fresh_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppressions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"address_hash" varchar(64) NOT NULL,
	"reason" varchar(48) NOT NULL,
	"lead_id" varchar(36),
	"note" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unsubscribes" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"address_hash" varchar(64) NOT NULL,
	"lead_id" varchar(36),
	"method" varchar(24) NOT NULL,
	"unsubscribed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "automation_run_steps" ADD CONSTRAINT "automation_run_steps_run_id_automation_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."automation_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_messages" ADD CONSTRAINT "outreach_messages_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_messages" ADD CONSTRAINT "outreach_messages_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poc_records" ADD CONSTRAINT "poc_records_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poc_revisions" ADD CONSTRAINT "poc_revisions_poc_record_id_poc_records_id_fk" FOREIGN KEY ("poc_record_id") REFERENCES "public"."poc_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reply_events" ADD CONSTRAINT "reply_events_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_snapshots" ADD CONSTRAINT "source_snapshots_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_target_idx" ON "audit_logs" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "audit_logs_run_idx" ON "audit_logs" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "automation_idempotency_operation_key_key" ON "automation_idempotency" USING btree ("operation","key_hash");--> statement-breakpoint
CREATE INDEX "automation_idempotency_expires_idx" ON "automation_idempotency" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "automation_run_steps_run_idx" ON "automation_run_steps" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "automation_runs_kind_status_idx" ON "automation_runs" USING btree ("kind","status");--> statement-breakpoint
CREATE INDEX "automation_runs_requested_by_idx" ON "automation_runs" USING btree ("requested_by");--> statement-breakpoint
CREATE UNIQUE INDEX "businesses_source_key" ON "businesses" USING btree ("source_type","source_external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "businesses_domain_key" ON "businesses" USING btree ("normalized_domain");--> statement-breakpoint
CREATE UNIQUE INDEX "businesses_phone_key" ON "businesses" USING btree ("normalized_phone");--> statement-breakpoint
CREATE UNIQUE INDEX "businesses_name_address_key" ON "businesses" USING btree ("normalized_name_key","normalized_address_key");--> statement-breakpoint
CREATE INDEX "businesses_name_idx" ON "businesses" USING btree ("normalized_name_key");--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_address_hash_key" ON "contacts" USING btree ("address_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "leads_business_id_key" ON "leads" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "leads_status_idx" ON "leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "leads_next_action_idx" ON "leads" USING btree ("next_action_at");--> statement-breakpoint
CREATE UNIQUE INDEX "outreach_messages_lead_sequence_key" ON "outreach_messages" USING btree ("lead_id","sequence_number");--> statement-breakpoint
CREATE UNIQUE INDEX "outreach_messages_idempotency_key" ON "outreach_messages" USING btree ("idempotency_key_hash");--> statement-breakpoint
CREATE INDEX "outreach_messages_status_idx" ON "outreach_messages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "outreach_messages_sent_at_idx" ON "outreach_messages" USING btree ("sent_at");--> statement-breakpoint
CREATE UNIQUE INDEX "poc_records_lead_id_key" ON "poc_records" USING btree ("lead_id");--> statement-breakpoint
CREATE UNIQUE INDEX "poc_records_slug_key" ON "poc_records" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "poc_records_state_idx" ON "poc_records" USING btree ("state");--> statement-breakpoint
CREATE UNIQUE INDEX "poc_revisions_record_version_key" ON "poc_revisions" USING btree ("poc_record_id","version");--> statement-breakpoint
CREATE INDEX "poc_revisions_record_idx" ON "poc_revisions" USING btree ("poc_record_id");--> statement-breakpoint
CREATE INDEX "reply_events_lead_idx" ON "reply_events" USING btree ("lead_id");--> statement-breakpoint
CREATE UNIQUE INDEX "source_snapshots_lead_checksum_key" ON "source_snapshots" USING btree ("lead_id","content_checksum");--> statement-breakpoint
CREATE INDEX "source_snapshots_lead_idx" ON "source_snapshots" USING btree ("lead_id");--> statement-breakpoint
CREATE UNIQUE INDEX "suppressions_address_hash_key" ON "suppressions" USING btree ("address_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "unsubscribes_address_hash_key" ON "unsubscribes" USING btree ("address_hash");
--> statement-breakpoint
-- Phase 2A: source_snapshots are immutable evidence. Any UPDATE or DELETE is
-- rejected at the database boundary; a changed fact is a NEW snapshot row.
CREATE OR REPLACE FUNCTION prevent_source_snapshot_mutation() RETURNS trigger AS $$
BEGIN
	RAISE EXCEPTION 'source_snapshots are immutable (lead_id=%)', OLD.lead_id;
END;
$$ LANGUAGE plpgsql;

--> statement-breakpoint
CREATE TRIGGER source_snapshots_immutable
	BEFORE UPDATE OR DELETE ON "source_snapshots"
	FOR EACH ROW EXECUTE FUNCTION prevent_source_snapshot_mutation();
