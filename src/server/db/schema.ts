import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

/**
 * Phase 1.1 + Phase 2A database schema.
 *
 * Phase 2A (Autonomous Automation Bridge) adds the persistent automation
 * model: businesses, leads, immutable evidence snapshots, poc_records with
 * revision history, automation run audit trails, contacts, outreach
 * messages, suppression state, idempotency records, and audit logs.
 * UUIDs are generated in application code with crypto.randomUUID();
 * nothing in this schema depends on a PostgreSQL UUID extension.
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

/**
 * Stable business identity, deliberately separated from workflow state (the
 * lead lifecycle lives in `leads`). Duplicate detection runs, in priority
 * order, on (source_type, source_external_id), normalized_domain,
 * normalized_phone, and (normalized_name_key, normalized_address_key).
 */
export const businesses = pgTable(
  "businesses",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    sourceType: varchar("source_type", { length: 48 }).notNull(),
    sourceExternalId: varchar("source_external_id", { length: 190 }),
    displayName: varchar("display_name", { length: 96 }).notNull(),
    normalizedNameKey: varchar("normalized_name_key", { length: 96 }).notNull(),
    normalizedAddressKey: varchar("normalized_address_key", { length: 190 }),
    normalizedDomain: varchar("normalized_domain", { length: 190 }),
    normalizedPhone: varchar("normalized_phone", { length: 32 }),
    primaryCategory: varchar("primary_category", { length: 64 }).notNull(),
    city: varchar("city", { length: 64 }),
    region: varchar("region", { length: 64 }),
    country: varchar("country", { length: 64 }),
    websiteUrl: varchar("website_url", { length: 2048 }),
    publicPhone: varchar("public_phone", { length: 32 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("businesses_source_key").on(table.sourceType, table.sourceExternalId),
    uniqueIndex("businesses_domain_key").on(table.normalizedDomain),
    uniqueIndex("businesses_phone_key").on(table.normalizedPhone),
    uniqueIndex("businesses_name_address_key").on(table.normalizedNameKey, table.normalizedAddressKey),
    index("businesses_name_idx").on(table.normalizedNameKey),
  ],
);

/**
 * One lead per business. Status transitions are validated against the
 * central lifecycle table (src/lib/automation/lifecycle.ts); nothing else
 * may write statuses. `version` provides optimistic concurrency.
 */
export const leads = pgTable(
  "leads",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    businessId: varchar("business_id", { length: 36 })
      .notNull()
      .references(() => businesses.id),
    status: varchar("status", { length: 32 }).notNull(),
    score: integer("score"),
    scoreReasons: jsonb("score_reasons").$type<string[]>(),
    /** Rejection / skip / suppression / failure reason (machine code). */
    outcomeReason: varchar("outcome_reason", { length: 200 }),
    /** Status before a technical failure, used by the explicit retry path. */
    previousStatus: varchar("previous_status", { length: 32 }),
    nextActionAt: timestamp("next_action_at", { withTimezone: true }),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("leads_business_id_key").on(table.businessId),
    index("leads_status_idx").on(table.status),
    index("leads_next_action_idx").on(table.nextActionAt),
  ],
);

/**
 * Immutable evidence snapshots. Updates and deletes are rejected by a
 * database trigger (see migration 0001); a changed fact is a new snapshot.
 */
export const sourceSnapshots = pgTable(
  "source_snapshots",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    leadId: varchar("lead_id", { length: 36 })
      .notNull()
      .references(() => leads.id),
    provider: varchar("provider", { length: 48 }).notNull(),
    sourceUrl: varchar("source_url", { length: 2048 }),
    sourceIdentifier: varchar("source_identifier", { length: 190 }),
    retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull(),
    /** SHA-256 of the deterministically canonicalized payload. */
    contentChecksum: varchar("content_checksum", { length: 64 }).notNull(),
    payload: jsonb("payload").notNull(),
    attribution: jsonb("attribution"),
    freshUntil: timestamp("fresh_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("source_snapshots_lead_checksum_key").on(table.leadId, table.contentChecksum),
    index("source_snapshots_lead_idx").on(table.leadId),
  ],
);

/** The current validated POC document (one per lead). */
export const pocRecords = pgTable(
  "poc_records",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    leadId: varchar("lead_id", { length: 36 })
      .notNull()
      .references(() => leads.id),
    slug: varchar("slug", { length: 96 }).notNull(),
    record: jsonb("record").notNull(),
    recordSchemaVersion: integer("record_schema_version").notNull(),
    version: integer("version").notNull().default(1),
    /** draft | qa_passed | published | expired | archived | failed */
    state: varchar("state", { length: 24 }).notNull().default("draft"),
    /** Last deterministic QA report (structured checks). */
    qaReport: jsonb("qa_report"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("poc_records_lead_id_key").on(table.leadId),
    uniqueIndex("poc_records_slug_key").on(table.slug),
    index("poc_records_state_idx").on(table.state),
  ],
);

/** Immutable POC history: the previous record version, written transactionally. */
export const pocRevisions = pgTable(
  "poc_revisions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    pocRecordId: varchar("poc_record_id", { length: 36 })
      .notNull()
      .references(() => pocRecords.id),
    version: integer("version").notNull(),
    record: jsonb("record").notNull(),
    reason: varchar("reason", { length: 200 }).notNull(),
    changedBy: varchar("changed_by", { length: 200 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("poc_revisions_record_version_key").on(table.pocRecordId, table.version),
    index("poc_revisions_record_idx").on(table.pocRecordId),
  ],
);

/**
 * Automation runs: an audit trail and resumable state model. No daemon polls
 * these tables; the external scheduler decides when to make the next call.
 */
export const automationRuns = pgTable(
  "automation_runs",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    parentRunId: varchar("parent_run_id", { length: 36 }),
    kind: varchar("kind", { length: 48 }).notNull(),
    /** running | completed | completed_with_skips | failed | cancelled */
    status: varchar("status", { length: 32 }).notNull().default("running"),
    requestedBy: varchar("requested_by", { length: 200 }).notNull(),
    counters: jsonb("counters").$type<Record<string, number>>().notNull().default({}),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("automation_runs_kind_status_idx").on(table.kind, table.status),
    index("automation_runs_requested_by_idx").on(table.requestedBy),
  ],
);

export const automationRunSteps = pgTable(
  "automation_run_steps",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    runId: varchar("run_id", { length: 36 })
      .notNull()
      .references(() => automationRuns.id),
    operation: varchar("operation", { length: 64 }).notNull(),
    leadId: varchar("lead_id", { length: 36 }),
    /** running | completed | skipped | failed */
    status: varchar("status", { length: 32 }).notNull(),
    errorCode: varchar("error_code", { length: 64 }),
    attempt: integer("attempt").notNull().default(1),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    /** Redacted, bounded summary — never raw payloads or contact data. */
    resultSummary: jsonb("result_summary"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("automation_run_steps_run_idx").on(table.runId)],
);

/**
 * Verified-or-not contact channels. The full raw address is stored only as
 * an AEAD envelope; the plain-text column holds ONLY the address domain
 * (needed for per-domain rate limits and safe to expose internally).
 */
export const contacts = pgTable(
  "contacts",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    businessId: varchar("business_id", { length: 36 })
      .notNull()
      .references(() => businesses.id),
    channel: varchar("channel", { length: 16 }).notNull().default("email"),
    /** Domain part only (for per-domain limits); never the full address. */
    normalizedDomain: varchar("normalized_domain", { length: 190 }),
    /** Keyed hash used for deduplication and suppression lookup. */
    addressHash: varchar("address_hash", { length: 64 }).notNull(),
    /** Versioned authenticated-encryption envelope; never logged. */
    encryptedAddress: text("encrypted_address"),
    /** unverified | verified */
    verificationState: varchar("verification_state", { length: 24 }).notNull().default("unverified"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    provenance: varchar("provenance", { length: 48 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("contacts_address_hash_key").on(table.addressHash)],
);

/** Permanent do-not-contact entries. Checked transactionally before any send. */
export const suppressions = pgTable(
  "suppressions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    addressHash: varchar("address_hash", { length: 64 }).notNull(),
    /** not_interested | unsubscribe | bounce | complaint | manual | fraud */
    reason: varchar("reason", { length: 48 }).notNull(),
    leadId: varchar("lead_id", { length: 36 }),
    note: varchar("note", { length: 200 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("suppressions_address_hash_key").on(table.addressHash)],
);

/** Unsubscribe state (distinct from suppression provenance). */
export const unsubscribes = pgTable(
  "unsubscribes",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    addressHash: varchar("address_hash", { length: 64 }).notNull(),
    leadId: varchar("lead_id", { length: 36 }),
    /** reply | one_click | link | manual */
    method: varchar("method", { length: 24 }).notNull(),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("unsubscribes_address_hash_key").on(table.addressHash)],
);

/** Prepared and sent outreach messages, at most one initial + N follow-ups per lead. */
export const outreachMessages = pgTable(
  "outreach_messages",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    leadId: varchar("lead_id", { length: 36 })
      .notNull()
      .references(() => leads.id),
    contactId: varchar("contact_id", { length: 36 })
      .notNull()
      .references(() => contacts.id),
    sequenceNumber: integer("sequence_number").notNull(),
    /** initial | followup */
    kind: varchar("kind", { length: 16 }).notNull(),
    subject: varchar("subject", { length: 200 }).notNull(),
    bodyText: text("body_text").notNull(),
    bodyHtml: text("body_html").notNull(),
    /** prepared | reserved | sent | failed | delivery_unknown */
    status: varchar("status", { length: 32 }).notNull().default("prepared"),
    /** Hash of the caller's idempotency key for this intended message. */
    idempotencyKeyHash: varchar("idempotency_key_hash", { length: 64 }).notNull(),
    providerMessageId: varchar("provider_message_id", { length: 254 }),
    preparedAt: timestamp("prepared_at", { withTimezone: true }).notNull().defaultNow(),
    reservedAt: timestamp("reserved_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    deliveryStatus: varchar("delivery_status", { length: 32 }),
    failureCode: varchar("failure_code", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("outreach_messages_lead_sequence_key").on(table.leadId, table.sequenceNumber),
    uniqueIndex("outreach_messages_idempotency_key").on(table.idempotencyKeyHash),
    index("outreach_messages_status_idx").on(table.status),
    index("outreach_messages_sent_at_idx").on(table.sentAt),
  ],
);

/** Externally classified reply outcomes (the scheduler supplies classification). */
export const replyEvents = pgTable(
  "reply_events",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    leadId: varchar("lead_id", { length: 36 })
      .notNull()
      .references(() => leads.id),
    messageId: varchar("message_id", { length: 36 }),
    classification: varchar("classification", { length: 24 }).notNull(),
    classifiedBy: varchar("classified_by", { length: 200 }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("reply_events_lead_idx").on(table.leadId)],
);

/** Idempotency ledger for every mutating automation operation. */
export const automationIdempotency = pgTable(
  "automation_idempotency",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    operation: varchar("operation", { length: 64 }).notNull(),
    principal: varchar("principal", { length: 200 }).notNull(),
    /** SHA-256 of (operation + idempotency key). */
    keyHash: varchar("key_hash", { length: 64 }).notNull(),
    /** SHA-256 of the canonicalized request; replay must match. */
    requestHash: varchar("request_hash", { length: 64 }).notNull(),
    /** pending | completed | failed */
    status: varchar("status", { length: 24 }).notNull().default("pending"),
    /** Safe (redacted) result JSON. */
    result: jsonb("result"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("automation_idempotency_operation_key_key").on(table.operation, table.keyHash),
    index("automation_idempotency_expires_idx").on(table.expiresAt),
  ],
);

/** Audit trail for every mutation. Metadata is redacted before insert. */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    actor: varchar("actor", { length: 200 }).notNull(),
    action: varchar("action", { length: 64 }).notNull(),
    targetType: varchar("target_type", { length: 48 }),
    targetId: varchar("target_id", { length: 64 }),
    runId: varchar("run_id", { length: 36 }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_logs_target_idx").on(table.targetType, table.targetId),
    index("audit_logs_run_idx").on(table.runId),
    index("audit_logs_created_idx").on(table.createdAt),
  ],
);

export type ShareLinkRow = typeof shareLinks.$inferSelect;
export type NewShareLinkRow = typeof shareLinks.$inferInsert;
export type BusinessRow = typeof businesses.$inferSelect;
export type LeadRow = typeof leads.$inferSelect;
export type SourceSnapshotRow = typeof sourceSnapshots.$inferSelect;
export type PocRecordRow = typeof pocRecords.$inferSelect;
export type PocRevisionRow = typeof pocRevisions.$inferSelect;
export type AutomationRunRow = typeof automationRuns.$inferSelect;
export type AutomationRunStepRow = typeof automationRunSteps.$inferSelect;
export type ContactRow = typeof contacts.$inferSelect;
export type SuppressionRow = typeof suppressions.$inferSelect;
export type UnsubscribeRow = typeof unsubscribes.$inferSelect;
export type OutreachMessageRow = typeof outreachMessages.$inferSelect;
export type ReplyEventRow = typeof replyEvents.$inferSelect;
export type AutomationIdempotencyRow = typeof automationIdempotency.$inferSelect;
export type AuditLogRow = typeof auditLogs.$inferSelect;
