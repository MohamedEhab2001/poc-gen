import { z } from "zod";
import { recordSchema, slugSchema, strictThemeIdSchema } from "@/lib/poc/schema";

/**
 * Shared operation contracts for the automation bridge. The MCP adapter,
 * the internal HTTP adapter, the services, the smoke command, and the tests
 * all use THESE schemas — adapters are thin wrappers and never redefine
 * validation. Every input is bounded (lengths, counts, enums) BEFORE any
 * database work.
 */

export const idKeySchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/^[A-Za-z0-9._:-]+$/, "Idempotency keys are alphanumeric plus . _ : - only.");

export const principalSchema = z.string().min(1).max(200);

export const leadIdSchema = z.string().uuid().max(36);
export const runIdSchema = z.string().uuid().max(36);

export const REPLY_CLASSIFICATIONS = [
  "INTERESTED",
  "QUESTION",
  "NOT_INTERESTED",
  "UNSUBSCRIBE",
  "OUT_OF_OFFICE",
  "BOUNCE",
  "AMBIGUOUS",
] as const;

export const replyClassificationSchema = z.enum(REPLY_CLASSIFICATIONS);

export const suppressionReasonSchema = z.enum([
  "not_interested",
  "unsubscribe",
  "bounce",
  "complaint",
  "manual",
  "fraud",
]);

// ---------------------------------------------------------------------------
// start_automation_run
// ---------------------------------------------------------------------------

export const startRunInputSchema = z.object({
  idempotencyKey: idKeySchema,
  kind: z
    .string()
    .min(3)
    .max(48)
    .regex(/^[a-z0-9_-]+$/, "Run kinds are lowercase slugs."),
  parentRunId: runIdSchema.nullable().optional(),
  note: z.string().max(200).nullable().optional(),
}).strict();

export const startRunResultSchema = z.object({
  runId: runIdSchema,
  kind: z.string(),
  status: z.string(),
  counters: z.record(z.string(), z.number()),
  resumed: z.boolean(),
});

// ---------------------------------------------------------------------------
// ingest_leads
// ---------------------------------------------------------------------------

export const evidenceSubmissionSchema = z.object({
  provider: z.string().min(2).max(48),
  sourceUrl: z.string().max(2048).nullable().optional(),
  sourceIdentifier: z.string().max(190).nullable().optional(),
  retrievedAt: z.string().datetime(),
  /** Structured facts only. Prohibited provider payloads must never be sent. */
  payload: z.unknown(),
  attribution: z
    .object({
      label: z.string().min(1).max(120),
      url: z.string().max(2048).nullable().optional(),
    })
    .nullable()
    .optional(),
  freshUntil: z.string().datetime().nullable().optional(),
});

export const contactSubmissionSchema = z.object({
  address: z.string().min(5).max(254),
  verified: z.boolean(),
  provenance: z.string().min(2).max(48),
});

export const leadCandidateSchema = z.object({
  candidateKey: z.string().min(1).max(96),
  business: z.object({
    sourceType: z.string().min(2).max(48),
    sourceExternalId: z.string().min(1).max(190).nullable().optional(),
    displayName: z.string().min(1).max(96),
    primaryCategory: z.string().min(1).max(64),
    website: z.string().max(2048).nullable().optional(),
    phone: z.string().min(7).max(32).nullable().optional(),
    address: z.string().max(200).nullable().optional(),
    city: z.string().max(64).nullable().optional(),
    region: z.string().max(64).nullable().optional(),
    country: z.string().max(64).nullable().optional(),
  }),
  score: z.number().int().min(0).max(100),
  scoreReasons: z.array(z.string().min(1).max(200)).max(10),
  evidence: z.array(evidenceSubmissionSchema).max(10),
  contact: contactSubmissionSchema.nullable().optional(),
});

export const ingestLeadsInputSchema = z.object({
  idempotencyKey: idKeySchema,
  runId: runIdSchema.nullable().optional(),
  candidates: z.array(leadCandidateSchema).min(1).max(10),
}).strict();

export const ingestCandidateResultSchema = z.object({
  candidateKey: z.string(),
  outcome: z.enum(["created", "matched_existing", "conflict", "rejected", "invalid"]),
  leadId: leadIdSchema.nullable().optional(),
  businessId: z.string().uuid().nullable().optional(),
  reason: z.string().max(200).nullable().optional(),
  /** Present on conflict: ids of the disagreeing existing businesses. */
  conflictCandidates: z.array(z.string().uuid()).max(8).optional(),
});

export const ingestLeadsResultSchema = z.object({
  results: z.array(ingestCandidateResultSchema),
  createdCount: z.number().int(),
  matchedCount: z.number().int(),
  rejectedCount: z.number().int(),
  conflictCount: z.number().int(),
  invalidCount: z.number().int(),
});

// ---------------------------------------------------------------------------
// upsert_poc_record
// ---------------------------------------------------------------------------

export const upsertPocInputSchema = z.object({
  idempotencyKey: idKeySchema,
  leadId: leadIdSchema,
  /** Complete BusinessPocRecord validated by the existing record schema. */
  record: recordSchema,
  /** Snapshot ids backing the factual claims in this record. */
  evidenceRefs: z.array(z.string().uuid()).max(20),
  reason: z.string().min(3).max(200),
  runId: runIdSchema.nullable().optional(),
}).strict();

export const upsertPocResultSchema = z.object({
  pocRecordId: z.string().uuid(),
  leadId: leadIdSchema,
  slug: slugSchema,
  version: z.number().int(),
  state: z.string(),
  revisionCreated: z.boolean(),
  leadStatus: z.string(),
});

// ---------------------------------------------------------------------------
// run_poc_qa
// ---------------------------------------------------------------------------

export const runQaInputSchema = z.object({
  idempotencyKey: idKeySchema,
  leadId: leadIdSchema,
  runId: runIdSchema.nullable().optional(),
}).strict();

export const qaCheckSchema = z.object({
  code: z.string(),
  severity: z.enum(["blocking", "warning"]),
  status: z.enum(["pass", "warn", "fail"]),
  details: z.record(z.string(), z.unknown()).optional(),
});

export const runQaResultSchema = z.object({
  leadId: leadIdSchema,
  passed: z.boolean(),
  blockingFailures: z.array(z.string()),
  checks: z.array(qaCheckSchema).max(32),
  leadStatus: z.string(),
  pocState: z.string(),
});

// ---------------------------------------------------------------------------
// publish_poc
// ---------------------------------------------------------------------------

export const publishPocInputSchema = z.object({
  idempotencyKey: idKeySchema,
  leadId: leadIdSchema,
  expiresInDays: z.number().int().min(1).max(365).nullable().optional(),
  maxViews: z.number().int().min(1).max(100_000).nullable().optional(),
  runId: runIdSchema.nullable().optional(),
}).strict();

export const publishPocResultSchema = z.object({
  pocRecordId: z.string().uuid(),
  leadId: leadIdSchema,
  slug: slugSchema,
  shareLinkId: z.string().uuid(),
  /**
   * Customer URL including the plaintext token. Returned EXACTLY ONCE.
   * Null on idempotent replays (the saved redacted result).
   */
  shareLinkUrl: z.string().max(2048).nullable(),
  expiresAt: z.string().datetime().nullable().optional(),
  maxViews: z.number().int().nullable().optional(),
  /** True when the idempotent replay returned the saved (token-redacted) result. */
  replayed: z.boolean(),
});

// ---------------------------------------------------------------------------
// prepare_outreach
// ---------------------------------------------------------------------------

export const claimSchema = z
  .object({
    statement: z.string().min(3).max(300),
    evidenceRef: z.string().uuid(),
    /** Deterministic support: the excerpt must occur in the snapshot payload. */
    supportingExcerpt: z.string().min(3).max(300),
    /** Optional RFC 6901 pointer into the snapshot payload. */
    jsonPointer: z.string().min(1).max(200).nullable().optional(),
  })
  .strict();

export const prepareOutreachInputSchema = z.object({
  idempotencyKey: idKeySchema,
  leadId: leadIdSchema,
  subject: z.string().min(3).max(200),
  body: z.string().min(20).max(8000),
  evidenceRefs: z.array(z.string().uuid()).max(20),
  claims: z.array(claimSchema).max(10).optional(),
  runId: runIdSchema.nullable().optional(),
}).strict();

export const prepareOutreachResultSchema = z.object({
  messageId: z.string().uuid(),
  leadId: leadIdSchema,
  kind: z.enum(["initial", "followup"]),
  sequenceNumber: z.number().int().min(0).max(2),
  subjectLength: z.number().int(),
  footer: z.object({
    senderName: z.string(),
    postalAddress: z.boolean(),
    unsubscribeUrl: z.boolean(),
    advertisementDisclosure: z.boolean(),
  }),
  leadStatus: z.string(),
});

// ---------------------------------------------------------------------------
// send_outreach
// ---------------------------------------------------------------------------

export const sendOutreachInputSchema = z.object({
  idempotencyKey: idKeySchema,
  messageId: z.string().uuid(),
  runId: runIdSchema.nullable().optional(),
}).strict();

export const sendOutreachResultSchema = z.object({
  messageId: z.string().uuid(),
  leadId: leadIdSchema,
  status: z.enum(["sent", "failed", "delivery_unknown"]),
  providerMessageId: z.string().max(254).nullable().optional(),
  leadStatus: z.string(),
});

// ---------------------------------------------------------------------------
// list_due_followups
// ---------------------------------------------------------------------------

export const listDueFollowupsInputSchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
}).strict();

export const dueFollowupSchema = z.object({
  leadId: leadIdSchema,
  displayName: z.string().max(96),
  slug: slugSchema,
  nextSequenceNumber: z.number().int().min(1).max(2),
  dueAt: z.string().datetime(),
});

export const listDueFollowupsResultSchema = z.object({
  due: z.array(dueFollowupSchema),
  count: z.number().int(),
  limit: z.number().int(),
});

// ---------------------------------------------------------------------------
// record_reply_outcome
// ---------------------------------------------------------------------------

export const recordReplyInputSchema = z.object({
  idempotencyKey: idKeySchema,
  leadId: leadIdSchema,
  classification: replyClassificationSchema,
  messageId: z.string().uuid().nullable().optional(),
  receivedAt: z.string().datetime().nullable().optional(),
  runId: runIdSchema.nullable().optional(),
}).strict();

export const recordReplyResultSchema = z.object({
  leadId: leadIdSchema,
  classification: replyClassificationSchema,
  leadStatus: z.string(),
  followupsStopped: z.boolean(),
  suppressionCreated: z.boolean(),
  nextActionAt: z.string().datetime().nullable().optional(),
});

// ---------------------------------------------------------------------------
// suppress_contact
// ---------------------------------------------------------------------------

export const suppressContactInputSchema = z
  .object({
    idempotencyKey: idKeySchema,
    address: z.string().min(5).max(254).nullable().optional(),
    leadId: leadIdSchema.nullable().optional(),
    reason: suppressionReasonSchema,
    note: z.string().max(200).nullable().optional(),
  })
  .strict()
  .refine((value) => Boolean(value.address ?? value.leadId), {
    message: "Provide an address or a leadId.",
  });

export const suppressContactResultSchema = z.object({
  suppressed: z.boolean(),
  addressHashPrefix: z.string().length(12),
  reason: z.string(),
  leadIds: z.array(leadIdSchema).max(10),
});

// ---------------------------------------------------------------------------
// get_run_report / get_interested_leads
// ---------------------------------------------------------------------------

export const runReportInputSchema = z.object({
  runId: runIdSchema,
}).strict();

export const runReportStepSchema = z.object({
  operation: z.string(),
  leadId: leadIdSchema.nullable().optional(),
  status: z.string(),
  errorCode: z.string().nullable().optional(),
  attempt: z.number().int(),
  summary: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const exceptionReplySchema = z.object({
  leadId: leadIdSchema,
  classification: z.string(),
  receivedAt: z.string().datetime(),
});

export const runReportResultSchema = z.object({
  runId: runIdSchema,
  kind: z.string(),
  status: z.string(),
  requestedBy: z.string(),
  counters: z.record(z.string(), z.number()),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().nullable().optional(),
  steps: z.array(runReportStepSchema).max(200),
  exceptionReplies: z.array(exceptionReplySchema).max(50),
});

// ---------------------------------------------------------------------------
// finish_automation_run (mutating completion, separate from read-only reports)
// ---------------------------------------------------------------------------

export const finishRunInputSchema = z
  .object({
    idempotencyKey: idKeySchema,
    runId: runIdSchema,
  })
  .strict();

export const finishRunResultSchema = z.object({
  runId: runIdSchema,
  kind: z.string(),
  status: z.string(),
  derivedFrom: z.string(),
  finishedAt: z.string().datetime().nullable().optional(),
  stepCount: z.number().int(),
  counters: z.record(z.string(), z.number()),
});

export const interestedLeadsInputSchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
}).strict();

export const interestedLeadSchema = z.object({
  leadId: leadIdSchema,
  displayName: z.string().max(96),
  slug: slugSchema.nullable(),
  status: z.string(),
  lastReplyAt: z.string().datetime().nullable().optional(),
  lastReplyClassification: z.string().nullable().optional(),
  shareViewCount: z.number().int().nullable().optional(),
});

export const interestedLeadsResultSchema = z.object({
  leads: z.array(interestedLeadSchema),
  count: z.number().int(),
});

// ---------------------------------------------------------------------------
// retry_failed_lead + health
// ---------------------------------------------------------------------------

export const retryFailedLeadInputSchema = z.object({
  idempotencyKey: idKeySchema,
  leadId: leadIdSchema,
}).strict();

export const retryFailedLeadResultSchema = z.object({
  leadId: leadIdSchema,
  status: z.string(),
  previousStatus: z.string(),
});

export const healthResultSchema = z.object({
  service: z.literal("poc-gen-automation"),
  version: z.string(),
  automationEnabled: z.boolean(),
  emergencyStop: z.boolean(),
  sendingEnabled: z.boolean(),
  databaseConfigured: z.boolean(),
  scopes: z.array(z.string()),
});

/** Exported for the tool registry so theme ids stay registry-driven. */
export { strictThemeIdSchema };
