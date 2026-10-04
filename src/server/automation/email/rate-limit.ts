import "server-only";

import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { providerRateLimits } from "@/server/db/schema";
import { advisoryLock } from "../db";
import type { Db, Tx } from "../db";

/**
 * Cross-instance PostgreSQL-backed provider throttle.
 *
 * EmailJS enforces roughly one request per second. Multiple server instances
 * (or concurrent sends in one instance) must therefore serialize their
 * provider calls through the DATABASE, not an in-memory timer:
 *
 *   1. reserveProviderSlot: ONE transaction takes an advisory lock on the
 *      provider name, reads/creates the next_slot_at row, returns the
 *      caller's reserved slot time, and advances the row by the interval.
 *      Concurrent reservations get strictly later slots.
 *   2. waitForSlot: waits OUTSIDE the transaction until the reserved slot
 *      arrives, with a bounded wait. The clock/sleeper is injectable so
 *      tests run without real delays.
 */

export interface InjectedClock {
  now(): number;
  sleep(ms: number): Promise<void>;
}

export const realClock: InjectedClock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

/**
 * Reserves the next provider slot. Returns the absolute time (epoch ms) the
 * caller may call the provider at. Slot spacing is at least `minIntervalMs`.
 */
export async function reserveProviderSlot(
  db: Db,
  providerName: string,
  minIntervalMs: number,
  nowMs: number,
): Promise<number> {
  return db.transaction(async (tx) => {
    await advisoryLock(tx as Tx, `provider-rate:${providerName}`);
    const rows = await tx
      .select({ nextSlotAt: providerRateLimits.nextSlotAt })
      .from(providerRateLimits)
      .where(sql`${providerRateLimits.name} = ${providerName}`)
      .limit(1);
    const current = rows[0]?.nextSlotAt?.getTime() ?? 0;
    const slot = Math.max(nowMs, current);
    const nextAfter = slot + minIntervalMs;
    await tx
      .insert(providerRateLimits)
      .values({ name: providerName, nextSlotAt: new Date(nextAfter), updatedAt: new Date() })
      .onConflictDoUpdate({
        target: providerRateLimits.name,
        set: { nextSlotAt: new Date(nextAfter), updatedAt: new Date() },
      });
    return slot;
  });
}

/**
 * Waits (outside any transaction) until the reserved slot arrives. Bounded:
 * when the slot is further away than maxWaitMs, returns false so the caller
 * fails retryably instead of holding pipeline state indefinitely.
 */
export async function waitForSlot(
  slotAtMs: number,
  clock: InjectedClock,
  maxWaitMs: number,
): Promise<boolean> {
  const remaining = slotAtMs - clock.now();
  if (remaining <= 0) return true;
  if (remaining > maxWaitMs) return false;
  await clock.sleep(remaining);
  return true;
}

/** Test helper: clear a provider's slot row (integration tests). */
export async function resetProviderSlot(db: Db, providerName: string): Promise<void> {
  await db.delete(providerRateLimits).where(sql`${providerRateLimits.name} = ${providerName}`);
}

export function newRateLimitRowId(): string {
  return randomUUID();
}
