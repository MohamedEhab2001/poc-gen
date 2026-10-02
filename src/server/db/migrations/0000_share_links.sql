CREATE TABLE "share_links" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"slug" varchar(96) NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"scope" varchar(32) DEFAULT 'poc:view' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"view_count" integer DEFAULT 0 NOT NULL,
	"max_views" integer,
	"created_by" varchar(200) NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE UNIQUE INDEX "share_links_token_hash_key" ON "share_links" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "share_links_slug_idx" ON "share_links" USING btree ("slug");