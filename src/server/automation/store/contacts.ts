import "server-only";

import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { businesses, contacts, leads, suppressions, unsubscribes } from "@/server/db/schema";
import type { ContactRow } from "@/server/db/schema";
import {
  contactAddressHash,
  encryptContactAddress,
} from "@/lib/automation/crypto";
import { emailDomain, normalizeEmailAddress } from "@/lib/automation/normalize";
import { AutomationError } from "@/lib/automation/outcomes";
import type { Db, Queryable, Tx } from "../db";

/**
 * Contacts, suppression, and unsubscribe state.
 *
 * - Addresses are normalized before use and stored as a keyed hash for
 *   dedup/suppression lookup; the raw address is kept only as a versioned
 *   AEAD envelope and is never logged.
 * - Suppression lookups happen transactionally before any send reservation.
 */

export interface ContactKeys {
  keys: Map<string, Buffer>;
  activeKeyId: string;
}

export interface UpsertContactInput {
  businessId: string;
  rawAddress: string;
  verified: boolean;
  provenance: string;
  keys: ContactKeys;
  now: Date;
}

export async function upsertContact(tx: Tx, input: UpsertContactInput): Promise<ContactRow> {
  const normalized = normalizeEmailAddress(input.rawAddress);
  if (!normalized) {
    throw new AutomationError(
      "invalid_contact_address",
      "The contact address is not a usable email address.",
      "REJECTED",
    );
  }
  const addressHash = contactAddressHash(normalized, input.keys.keys);
  const envelope = encryptContactAddress(normalized, input.keys.activeKeyId, input.keys.keys.get(input.keys.activeKeyId)!);

  const existing = await tx.select().from(contacts).where(eq(contacts.addressHash, addressHash)).limit(1);
  const existingRow = existing[0];
  if (existingRow) {
    // Never downgrade verification; refresh provenance and re-verify state.
    const updated = await tx
      .update(contacts)
      .set({
        verificationState: input.verified || existingRow.verificationState === "verified" ? "verified" : "unverified",
        verifiedAt: input.verified ? input.now : existingRow.verifiedAt,
        provenance: input.provenance,
        updatedAt: input.now,
      })
      .where(eq(contacts.id, existingRow.id))
      .returning();
    const first = updated[0];
    if (!first) throw new AutomationError("update_failed", "The contact row could not be updated.", "FAILED");
    return first;
  }

  const inserted = await tx
    .insert(contacts)
    .values({
      id: randomUUID(),
      businessId: input.businessId,
      channel: "email",
      normalizedDomain: emailDomain(normalized),
      addressHash,
      encryptedAddress: envelope,
      verificationState: input.verified ? "verified" : "unverified",
      verifiedAt: input.verified ? input.now : null,
      provenance: input.provenance,
    })
    .returning();
  const first = inserted[0];
  if (!first) throw new AutomationError("insert_failed", "The contact row could not be created.", "FAILED");
  return first;
}

export async function getContactByHash(db: Queryable, addressHash: string): Promise<ContactRow | null> {
  const rows = await db.select().from(contacts).where(eq(contacts.addressHash, addressHash)).limit(1);
  return rows[0] ?? null;
}

export async function getVerifiedContactForBusiness(
  db: Queryable,
  businessId: string,
): Promise<ContactRow | null> {
  const rows = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.businessId, businessId), eq(contacts.verificationState, "verified")))
    .limit(1);
  return rows[0] ?? null;
}

export async function listContactsForBusiness(tx: Tx, businessId: string): Promise<ContactRow[]> {
  return tx.select().from(contacts).where(eq(contacts.businessId, businessId));
}

// ---------------------------------------------------------------------------
// Suppression and unsubscribe state
// ---------------------------------------------------------------------------

export type SuppressionReason =
  | "not_interested"
  | "unsubscribe"
  | "bounce"
  | "complaint"
  | "manual"
  | "fraud";

export interface SuppressionCheck {
  suppressed: boolean;
  reason: string | null;
  unsubscribed: boolean;
}

/**
 * Transactional suppression lookup. MUST be called inside the send
 * transaction; the unique constraints on suppressions/unsubscribes make
 * racing inserts idempotent, and a send reservation after this check can
 * only proceed when it returns clean.
 */
export async function checkSuppression(db: Queryable, addressHash: string): Promise<SuppressionCheck> {
  const suppressedRow = await db
    .select({ reason: suppressions.reason })
    .from(suppressions)
    .where(eq(suppressions.addressHash, addressHash))
    .limit(1);
  const unsubRow = await db
    .select({ id: unsubscribes.id })
    .from(unsubscribes)
    .where(eq(unsubscribes.addressHash, addressHash))
    .limit(1);
  return {
    suppressed: Boolean(suppressedRow[0]),
    reason: suppressedRow[0]?.reason ?? null,
    unsubscribed: Boolean(unsubRow[0]),
  };
}

export async function addSuppression(
  tx: Tx,
  input: { addressHash: string; reason: SuppressionReason; leadId?: string | null; note?: string | null },
): Promise<boolean> {
  const inserted = await tx
    .insert(suppressions)
    .values({
      id: randomUUID(),
      addressHash: input.addressHash,
      reason: input.reason,
      leadId: input.leadId ?? null,
      note: input.note ?? null,
    })
    .onConflictDoNothing({ target: suppressions.addressHash })
    .returning({ id: suppressions.id });
  return inserted.length > 0;
}

export async function addUnsubscribe(
  tx: Tx,
  input: { addressHash: string; leadId?: string | null; method: "reply" | "one_click" | "link" | "manual" },
): Promise<boolean> {
  const inserted = await tx
    .insert(unsubscribes)
    .values({
      id: randomUUID(),
      addressHash: input.addressHash,
      leadId: input.leadId ?? null,
      method: input.method,
    })
    .onConflictDoNothing({ target: unsubscribes.addressHash })
    .returning({ id: unsubscribes.id });
  return inserted.length > 0;
}

/** Lead ids whose contact is a given hash (suppression reporting). */
export async function findLeadsForAddressHash(db: Queryable, addressHash: string): Promise<string[]> {
  const rows = await db
    .select({ leadId: leads.id })
    .from(contacts)
    .innerJoin(businesses, eq(contacts.businessId, businesses.id))
    .innerJoin(leads, eq(leads.businessId, businesses.id))
    .where(eq(contacts.addressHash, addressHash));
  return rows.map((row) => row.leadId);
}

export async function suppressionExists(db: Db, addressHash: string): Promise<boolean> {
  const rows = await db
    .select({ id: suppressions.id })
    .from(suppressions)
    .where(eq(suppressions.addressHash, addressHash))
    .limit(1);
  return rows.length > 0;
}
