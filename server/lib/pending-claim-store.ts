import { randomBytes } from "crypto";

export interface PendingClaimRecord {
  email: string;
  organizationId: string | null;
  accountId: string | null;
  createdAt: number;
}

const TTL_MS = 10 * 60 * 1000;

const byCode = new Map<string, PendingClaimRecord>();
const byEmail = new Map<string, { code: string; record: PendingClaimRecord }>();

function isExpired(record: PendingClaimRecord): boolean {
  return Date.now() - record.createdAt > TTL_MS;
}

function sweep(): void {
  for (const [code, record] of byCode) {
    if (isExpired(record)) {
      byCode.delete(code);
      const indexed = byEmail.get(record.email);
      if (indexed && indexed.code === code) byEmail.delete(record.email);
    }
  }
}

export function generateHandoffCode(): string {
  // ~16 hex chars, short enough for a custom-scheme URL but high entropy.
  return randomBytes(8).toString("hex").toUpperCase();
}

export function storePendingClaim(input: {
  email: string;
  organizationId?: string | null;
  accountId?: string | null;
}): { code: string; record: PendingClaimRecord } {
  sweep();
  const email = input.email.toLowerCase().trim();
  const record: PendingClaimRecord = {
    email,
    organizationId: input.organizationId ?? null,
    accountId: input.accountId ?? null,
    createdAt: Date.now(),
  };
  const code = generateHandoffCode();
  byCode.set(code, record);
  // Replace any prior code for this email so the most recent handoff wins.
  byEmail.set(email, { code, record });
  return { code, record };
}

/**
 * Look up and consume a pending claim by its single-use handoff code.
 * The record is deleted on read so a code cannot be replayed.
 */
export function consumePendingClaimByCode(code: string): PendingClaimRecord | null {
  sweep();
  const record = byCode.get(code);
  if (!record) return null;
  byCode.delete(code);
  const indexed = byEmail.get(record.email);
  if (indexed && indexed.code === code) byEmail.delete(record.email);
  if (isExpired(record)) return null;
  return record;
}

/**
 * Best-effort lookup by email. Used as a fallback when the handoff code is
 * lost in transit. Does NOT consume the record so the regular code-based
 * resume path can still pick it up.
 */
export function peekPendingClaimByEmail(email: string): PendingClaimRecord | null {
  sweep();
  const indexed = byEmail.get(email.toLowerCase().trim());
  if (!indexed) return null;
  if (isExpired(indexed.record)) return null;
  return indexed.record;
}

export function _resetPendingClaimStoreForTests(): void {
  byCode.clear();
  byEmail.clear();
}
