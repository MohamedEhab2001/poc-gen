import "server-only";

import { sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { AutomationError } from "@/lib/automation/outcomes";

/**
 * Database access helpers for the automation layer. Every state transition
 * that spans multiple tables runs inside withTransaction; cross-process
 * correctness relies on row locks, advisory transaction locks, conditional
 * updates, and unique constraints — never in-memory locks.
 */

export type Db = ReturnType<typeof getDb>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
/** Structural type accepted by read-only store helpers (works with db or tx). */
export type Queryable = Pick<Db, "select" | "update" | "insert" | "delete" | "execute">;

export function databaseAvailable(): boolean {
  try {
    return Boolean(getDb());
  } catch {
    return false;
  }
}

export async function withTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  let db: Db;
  try {
    db = getDb();
  } catch {
    throw new AutomationError(
      "database_unavailable",
      "The operation could not be completed.",
      "RETRYABLE",
      30,
    );
  }
  // Errors from the transaction body (including driver errors and business
  // rejections) bubble with their original types; the dispatcher classifies
  // infrastructure failures as retryable for the external scheduler.
  return db.transaction(fn);
}

export async function withDatabase<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  let db: Db;
  try {
    db = getDb();
  } catch {
    throw new AutomationError(
      "database_unavailable",
      "The operation could not be completed.",
      "RETRYABLE",
      30,
    );
  }
  return fn(db);
}

/** True for PostgreSQL driver-level failures the scheduler may retry. */
export function isInfrastructureError(error: unknown): boolean {
  if (error instanceof AutomationError) return false;
  // Drizzle wraps driver errors (DrizzleQueryError); the PostgreSQL SQLSTATE
  // lives on the error itself or its cause.
  const candidates = [error, (error as { cause?: unknown })?.cause];
  return candidates.some(
    (candidate) =>
      typeof candidate === "object" &&
      candidate !== null &&
      "code" in candidate &&
      typeof (candidate as { code?: unknown }).code === "string" &&
      /^[0-9A-Z]{5}$/.test((candidate as { code: string }).code),
  );
}

/**
 * Advisory transaction lock serializing duplicate-detection on one dedup
 * key. Scoped to the transaction; released automatically at commit/rollback.
 */
export async function advisoryLock(tx: Tx, key: string): Promise<void> {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${key}))`);
}

/**
 * The shared CONTACT-LEVEL lock key. Every path that decides a contact's
 * sendability — send reservation, suppression, unsubscribe — must hold this
 * lock across its decision+write so suppression and sending have a
 * deterministic linearized order. Derived from the keyed address hash,
 * never the plaintext address.
 */
export function contactLockKey(addressHash: string): string {
  return `contact:${addressHash}`;
}
