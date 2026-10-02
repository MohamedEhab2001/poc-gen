import { index, integer, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

/**
 * Phase 1.1 database schema. Only share links are persisted today; Phase 2
 * adds leads, snapshots, poc_records, assets, jobs, analytics, outreach
 * drafts, and audit logs alongside this table.
 */
export const shareLinks = pgTable(
  "share_links",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    slug: varchar("slug", { length: 96 }).notNull(),
    /** SHA-256 hex digest of the plaintext token. The token is never stored. */
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    scope: varchar("scope", { length: 32 }).notNull().default("poc:view"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    viewCount: integer("view_count").notNull().default(0),
    maxViews: integer("max_views"),
    createdBy: varchar("created_by", { length: 200 }).notNull(),
    note: text("note"),
  },
  (table) => [
    uniqueIndex("share_links_token_hash_key").on(table.tokenHash),
    index("share_links_slug_idx").on(table.slug),
  ],
);

export type ShareLinkRow = typeof shareLinks.$inferSelect;
export type NewShareLinkRow = typeof shareLinks.$inferInsert;
