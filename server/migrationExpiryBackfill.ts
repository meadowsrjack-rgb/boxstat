import { db } from './db';
import { productEnrollments } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * One-shot idempotent backfill: clamp any migration-sourced enrollment whose
 * endDate exceeds createdAt + 2 months down to createdAt + 2 months.
 *
 * Safe to run repeatedly — the WHERE clause only matches rows still out of
 * spec, and we don't touch status, gracePeriodEndDate, team memberships, or
 * notifications. The regular expiry job handles those transitions.
 */
export async function runMigrationExpiryBackfill(): Promise<void> {
  try {
    const result = await db
      .update(productEnrollments)
      .set({
        endDate: sql<string>`${productEnrollments.createdAt} + interval '2 months'`,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(productEnrollments.source, 'migration'),
          sql`${productEnrollments.endDate} > ${productEnrollments.createdAt} + interval '2 months'`,
        ),
      )
      .returning({ id: productEnrollments.id });

    const count = Array.isArray(result) ? result.length : 0;
    console.log(`[Migration Expiry Backfill] Clamped ${count} migration enrollment(s) to createdAt + 2 months.`);
  } catch (err) {
    console.error('[Migration Expiry Backfill] Failed:', err);
  }
}
