import { db } from './db';
import { productEnrollments } from '@shared/schema';
import { and, eq, isNull, ne, or } from 'drizzle-orm';

interface BackfillResult {
  scanned: number;
  cancelled: number;
}

export interface DuplicateScanRow {
  id: number;
  profileId: string | null;
  programId: string | null;
  status: string;
  source: string | null;
  paymentId: string | null;
  stripeSubscriptionId: string | null;
  isTryout?: boolean | null;
}

export interface DuplicateCancellation {
  cancelId: number;
  keepId: number;
}

/**
 * Pure helper that picks which active enrollment rows should be cancelled as
 * duplicates of a paid row for the same player + program. Exposed for unit
 * testing without a database.
 *
 * Task #332: Source is no longer a gate — any active row that lacks payment
 * evidence (no `paymentId` AND no `stripeSubscriptionId`) is a candidate for
 * cancellation when a paid row exists for the same profile+program. This
 * collapses leftover unpaid grants whose source is admin_assignment,
 * self_claim, admin, direct, migration, import, or any historic
 * `payment`-row whose payment never landed. Tryout rows are preserved so a
 * paid full-program enrollment doesn't accidentally retire a tryout credit.
 *
 * If multiple paid rows exist for the same profile+program (rare), we keep
 * the most recent one (highest id) and let the others stand — only unpaid
 * leftovers are collapsed.
 */
export function findDuplicatesToCancel(rows: DuplicateScanRow[]): DuplicateCancellation[] {
  const groups = new Map<string, DuplicateScanRow[]>();
  for (const row of rows) {
    if (row.status !== 'active') continue;
    if (!row.profileId || !row.programId) continue;
    if (row.isTryout) continue;
    const key = `${row.profileId}::${row.programId}`;
    const list = groups.get(key) || [];
    list.push(row);
    groups.set(key, list);
  }

  const out: DuplicateCancellation[] = [];
  for (const rowsForGroup of Array.from(groups.values())) {
    const paidRows = rowsForGroup.filter((r) => r.paymentId || r.stripeSubscriptionId);
    if (paidRows.length === 0) continue;
    // Most recent paid row wins (highest id ≈ most recently created).
    const keep = paidRows.reduce((acc, r) => (r.id > acc.id ? r : acc), paidRows[0]);
    for (const r of rowsForGroup) {
      if (r.id === keep.id) continue;
      if (r.paymentId || r.stripeSubscriptionId) continue;
      out.push({ cancelId: r.id, keepId: keep.id });
    }
  }
  return out;
}

/**
 * Task #326: Find every (profileId, programId) where a paid enrollment
 * (paymentId or stripeSubscriptionId set) and one or more active unpaid
 * `admin_assignment` / `self_claim` enrollments coexist, and cancel the
 * unpaid duplicates so they stop tripping the access banners.
 *
 * Each cancelled row records why in its metadata so admins can audit later.
 * Idempotent — safe to re-run on every boot.
 */
export async function backfillDuplicateEnrollments(): Promise<BackfillResult> {
  const result: BackfillResult = { scanned: 0, cancelled: 0 };
  try {
    // Pull all active rows so we can match in JS — keeps the query simple
    // and avoids a self-join.
    const activeRows = await db
      .select()
      .from(productEnrollments)
      .where(eq(productEnrollments.status, 'active'));

    result.scanned = activeRows.length;

    const cancellations = findDuplicatesToCancel(
      activeRows.map((r): DuplicateScanRow => ({
        id: r.id,
        profileId: r.profileId,
        programId: r.programId,
        status: r.status,
        source: r.source,
        paymentId: r.paymentId,
        stripeSubscriptionId: r.stripeSubscriptionId,
        isTryout: r.isTryout,
      })),
    );
    if (cancellations.length === 0) {
      console.log(
        `[Backfill Duplicate Enrollments] No-op: scanned ${result.scanned} active rows, no unpaid duplicates of paid enrollments found.`,
      );
      return result;
    }

    // Build a quick metadata lookup so we preserve any existing metadata
    // when we cancel each duplicate row.
    const rowById = new Map(activeRows.map((r) => [r.id, r]));
    const now = new Date().toISOString();

    for (const { cancelId, keepId } of cancellations) {
      const dupe = rowById.get(cancelId);
      if (!dupe) continue;
      const existingMetadata: Record<string, unknown> =
        dupe.metadata && typeof dupe.metadata === 'object' && !Array.isArray(dupe.metadata)
          ? (dupe.metadata as Record<string, unknown>)
          : {};
      const updated = await db
        .update(productEnrollments)
        .set({
          status: 'cancelled',
          metadata: {
            ...existingMetadata,
            cancelledReason: 'duplicate_paid_enrollment_exists',
            cancelledAt: now,
            replacedByEnrollmentId: keepId,
            cancelledBy: 'backfillDuplicateEnrollments',
            cancelledFromSource: dupe.source ?? null,
          },
          updatedAt: now,
        })
        .where(
          and(
            eq(productEnrollments.id, cancelId),
            eq(productEnrollments.status, 'active'),
            or(eq(productEnrollments.isTryout, false), isNull(productEnrollments.isTryout)),
            isNull(productEnrollments.paymentId),
            isNull(productEnrollments.stripeSubscriptionId),
            ne(productEnrollments.id, keepId),
          ),
        )
        .returning({ id: productEnrollments.id });
      if (updated.length > 0) {
        result.cancelled++;
        // Per-row audit log so operators can trace exactly which player /
        // program / enrollment ids were collapsed and which paid row each
        // cancellation now points at.
        console.log(
          `[Backfill Duplicate Enrollments] Cancelled enrollment id=${cancelId} ` +
            `(profileId=${dupe.profileId} programId=${dupe.programId} ` +
            `source=${dupe.source ?? 'null'}) — replaced by id=${keepId}.`,
        );
      }
    }

    console.log(
      `[Backfill Duplicate Enrollments] Cancelled ${result.cancelled} unpaid duplicate enrollment(s) (scanned ${result.scanned} active rows).`,
    );
  } catch (err) {
    console.error('[Backfill Duplicate Enrollments] Failed:', err);
  }
  return result;
}

