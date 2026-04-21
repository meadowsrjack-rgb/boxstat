import crypto from 'crypto';
import { db } from './db';
import { users } from '@shared/schema';
import { and, eq, isNull, sql } from 'drizzle-orm';

export async function backfillStrandedInvites(): Promise<void> {
  try {
    const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const candidates = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          isNull(users.password),
          isNull(users.inviteToken),
          eq(users.hasRegistered, false),
          eq(users.status, 'active'),
        ),
      );

    if (candidates.length === 0) {
      console.log('[Backfill Stranded Invites] No-op: zero stranded accounts.');
      return;
    }

    let repaired = 0;
    for (const row of candidates) {
      const token = crypto.randomBytes(32).toString('hex');
      const result = await db
        .update(users)
        .set({
          status: 'invited',
          inviteToken: token,
          inviteTokenExpiry: expiry,
        })
        .where(
          and(
            eq(users.id, row.id),
            isNull(users.password),
            isNull(users.inviteToken),
            eq(users.hasRegistered, false),
            eq(users.status, 'active'),
          ),
        )
        .returning({ id: users.id });
      if (result.length > 0) repaired++;
    }

    console.log(
      `[Backfill Stranded Invites] Repaired ${repaired} account(s) (status=invited, fresh 7-day inviteToken).`,
    );
  } catch (err) {
    console.error('[Backfill Stranded Invites] Failed:', err);
  }
}
