CREATE TABLE "provider_rate_limits" (
	"name" varchar(64) PRIMARY KEY NOT NULL,
	"next_slot_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "automation_idempotency_operation_key_key";--> statement-breakpoint
DROP INDEX "businesses_domain_key";--> statement-breakpoint
DROP INDEX "businesses_phone_key";--> statement-breakpoint
ALTER TABLE "outreach_messages" ADD COLUMN "poc_url" varchar(2048);--> statement-breakpoint
CREATE UNIQUE INDEX "automation_idempotency_principal_key" ON "automation_idempotency" USING btree ("principal","operation","key_hash");--> statement-breakpoint
CREATE INDEX "businesses_domain_idx" ON "businesses" USING btree ("normalized_domain");--> statement-breakpoint
CREATE INDEX "businesses_phone_idx" ON "businesses" USING btree ("normalized_phone");