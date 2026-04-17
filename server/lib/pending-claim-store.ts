import { randomBytes } from "crypto";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { db } from "../db";
import { pendingClaims } from "@shared/schema";

export interface PendingClaimRecord {
  email: string;
  organizationId: string | null;
  accountId: string | null;
  createdAt: number;
}

const TTL_MS = 10 * 60 * 1000;
const SWEEP_INTERVAL_MS = 60 * 1000;

let sweeperHandle: ReturnType<typeof setInterval> | null = null;

function rowToRecord(row: typeof pendingClaims.$inferSelect): PendingClaimRecord {
  return {
    email: row.email,
    organizationId: row.organizationId ?? null,
    accountId: row.accountId ?? null,
    createdAt: row.createdAt instanceof Date ? row.createdAt.getTime() : Date.now(),
  };
}

export function generateHandoffCode(): string {
  // ~16 hex chars, short enough for a custom-scheme URL but high entropy.
  return randomBytes(8).toString("hex").toUpperCase();
}

export async function storePendingClaim(input: {
  email: string;
  organizationId?: string | null;
  accountId?: string | null;
}): Promise<{ code: string; record: PendingClaimRecord }> {
  const email = input.email.toLowerCase().trim();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TTL_MS);
  const code = generateHandoffCode();

  // Atomic "latest wins" per email: a unique index on email ensures only one
  // live row exists per address, and ON CONFLICT replaces the prior code
  // (and all metadata) in a single statement so concurrent mints can't leave
  // multiple live rows behind.
  const [row] = await db
    .insert(pendingClaims)
    .values({
      code,
      email,
      organizationId: input.organizationId ?? null,
      accountId: input.accountId ?? null,
      createdAt: now,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: pendingClaims.email,
      set: {
        code,
        organizationId: input.organizationId ?? null,
        accountId: input.accountId ?? null,
        createdAt: now,
        expiresAt,
      },
    })
    .returning();

  return { code, record: rowToRecord(row) };
}

/**
 * Look up and consume a pending claim by its single-use handoff code.
 * The record is deleted on read so a code cannot be replayed. Returns null
 * if the code is unknown or already expired (expired rows are also deleted).
 */
export async function consumePendingClaimByCode(
  code: string,
): Promise<PendingClaimRecord | null> {
  const [row] = await db
    .delete(pendingClaims)
    .where(eq(pendingClaims.code, code))
    .returning();
  if (!row) return null;
  const expiresAt = row.expiresAt instanceof Date ? row.expiresAt.getTime() : 0;
  if (expiresAt <= Date.now()) return null;
  return rowToRecord(row);
}

/**
 * Best-effort lookup by email. Used as a fallback when the handoff code is
 * lost in transit. Does NOT consume the record so the regular code-based
 * resume path can still pick it up.
 */
export async function peekPendingClaimByEmail(
  email: string,
): Promise<PendingClaimRecord | null> {
  const normalized = email.toLowerCase().trim();
  const now = new Date();
  const [row] = await db
    .select()
    .from(pendingClaims)
    .where(and(eq(pendingClaims.email, normalized), gt(pendingClaims.expiresAt, now)))
    .limit(1);
  if (!row) return null;
  return rowToRecord(row);
}

/** Returns the count of currently-live (non-expired) pending claim records. */
export async function countLivePendingClaims(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(pendingClaims)
    .where(gt(pendingClaims.expiresAt, new Date()));
  return row?.count ?? 0;
}

/** Delete expired rows. Returns the number of rows removed. */
export async function sweepExpiredPendingClaims(): Promise<number> {
  const rows = await db
    .delete(pendingClaims)
    .where(lt(pendingClaims.expiresAt, new Date()))
    .returning({ code: pendingClaims.code });
  return rows.length;
}

/**
 * Start the background sweeper. Idempotent: calling this more than once is a
 * no-op. The sweeper runs every minute and removes expired pending-claim
 * rows so reads don't have to do that work inline.
 */
export function startPendingClaimSweeper(): void {
  if (sweeperHandle) return;
  sweeperHandle = setInterval(() => {
    sweepExpiredPendingClaims().catch((err) => {
      console.error("[ClaimResume] sweeper error", err);
    });
  }, SWEEP_INTERVAL_MS);
  // Don't keep the event loop alive solely for this timer.
  if (typeof sweeperHandle.unref === "function") sweeperHandle.unref();
}

export function stopPendingClaimSweeper(): void {
  if (sweeperHandle) {
    clearInterval(sweeperHandle);
    sweeperHandle = null;
  }
}

export async function _resetPendingClaimStoreForTests(): Promise<void> {
  await db.delete(pendingClaims);
}
