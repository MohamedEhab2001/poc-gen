CREATE TABLE "outreach_campaign_areas" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"campaign_state_id" varchar(36) NOT NULL,
	"area_key" varchar(96) NOT NULL,
	"label" varchar(120) NOT NULL,
	"status" varchar(24) DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_run_id" varchar(36),
	"last_searched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outreach_campaign_states" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"campaign_id" varchar(36) NOT NULL,
	"state_code" varchar(2) NOT NULL,
	"state_name" varchar(64) NOT NULL,
	"queue_index" integer NOT NULL,
	"status" varchar(24) DEFAULT 'pending' NOT NULL,
	"planned_area_count" integer DEFAULT 0 NOT NULL,
	"processed_area_count" integer DEFAULT 0 NOT NULL,
	"consecutive_empty_runs" integer DEFAULT 0 NOT NULL,
	"statewide_sweep_count" integer DEFAULT 0 NOT NULL,
	"discovered_count" integer DEFAULT 0 NOT NULL,
	"qualified_count" integer DEFAULT 0 NOT NULL,
	"queued_count" integer DEFAULT 0 NOT NULL,
	"contacted_count" integer DEFAULT 0 NOT NULL,
	"rejected_count" integer DEFAULT 0 NOT NULL,
	"last_run_id" varchar(36),
	"last_search_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outreach_campaigns" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(96) NOT NULL,
	"country" varchar(64) DEFAULT 'United States' NOT NULL,
	"state_queue" jsonb NOT NULL,
	"current_state_index" integer DEFAULT 0 NOT NULL,
	"status" varchar(24) DEFAULT 'active' NOT NULL,
	"max_sends_per_run" integer DEFAULT 3 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" varchar(200) NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "outreach_campaign_areas" ADD CONSTRAINT "outreach_campaign_areas_campaign_state_id_outreach_campaign_states_id_fk" FOREIGN KEY ("campaign_state_id") REFERENCES "public"."outreach_campaign_states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreach_campaign_states" ADD CONSTRAINT "outreach_campaign_states_campaign_id_outreach_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."outreach_campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "outreach_campaign_areas_state_area_key" ON "outreach_campaign_areas" USING btree ("campaign_state_id","area_key");--> statement-breakpoint
CREATE INDEX "outreach_campaign_areas_pending_idx" ON "outreach_campaign_areas" USING btree ("campaign_state_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "outreach_campaign_states_campaign_state_key" ON "outreach_campaign_states" USING btree ("campaign_id","state_code");--> statement-breakpoint
CREATE UNIQUE INDEX "outreach_campaign_states_campaign_queue_key" ON "outreach_campaign_states" USING btree ("campaign_id","queue_index");--> statement-breakpoint
CREATE INDEX "outreach_campaign_states_status_idx" ON "outreach_campaign_states" USING btree ("campaign_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "outreach_campaigns_name_key" ON "outreach_campaigns" USING btree ("name");--> statement-breakpoint
CREATE INDEX "outreach_campaigns_status_idx" ON "outreach_campaigns" USING btree ("status");