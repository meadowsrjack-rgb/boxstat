import { db } from './db';
import { users } from '@shared/schema';
import { and, eq, isNotNull, or } from 'drizzle-orm';

// One-shot, idempotent backfill: clear the stale "Invited" flag for users
// who clearly already finished registering (they have a password and are
// active) but whose status / hasRegistered fields were never updated by the
// magic-link or set-password paths. Safe to re-run on every boot.
export async function backfillRegisteredInviteFlags(): Promise<void> {
  try {
    const candidates = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          isNotNull(users.password),
          eq(users.isActive, true),
          or(eq(users.status, 'invited'), eq(users.hasRegistered, false)),
        ),
      );

    if (candidates.length === 0) {
      console.log('[Backfill Registered Invite Flags] No-op: zero stale rows.');
      return;
    }

    let fixed = 0;
    for (const row of candidates) {
      const result = await db
        .update(users)
        .set({
          status: 'active',
          hasRegistered: true,
          inviteToken: null,
          inviteTokenExpiry: null,
        })
        .where(
          and(
            eq(users.id, row.id),
            isNotNull(users.password),
            eq(users.isActive, true),
            or(eq(users.status, 'invited'), eq(users.hasRegistered, false)),
          ),
        )
        .returning({ id: users.id });
      if (result.length > 0) fixed++;
    }

    console.log(
      `[Backfill Registered Invite Flags] Cleared stale Invited flag on ${fixed} already-registered account(s).`,
    );
  } catch (err) {
    console.error('[Backfill Registered Invite Flags] Failed:', err);
  }
}
