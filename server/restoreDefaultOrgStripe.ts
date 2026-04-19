import { db } from './db';
import { organizations } from '@shared/schema';
import { eq, and, isNull } from 'drizzle-orm';

const TARGET_ORG_ID = 'default-org';
const TARGET_ACCOUNT_ID = 'acct_1FsxbMDffY6JnI6O';

export async function restoreDefaultOrgStripeConnection(): Promise<void> {
  try {
    const result = await db
      .update(organizations)
      .set({
        stripeConnectedId: TARGET_ACCOUNT_ID,
        stripeConnectType: 'express',
        stripeConnectStatus: 'active',
      })
      .where(
        and(
          eq(organizations.id, TARGET_ORG_ID),
          isNull(organizations.stripeConnectedId),
        ),
      )
      .returning({ id: organizations.id });

    if (Array.isArray(result) && result.length > 0) {
      console.log(
        `[Restore Default Org Stripe] Restored ${TARGET_ACCOUNT_ID} on '${TARGET_ORG_ID}' (was previously cleared).`,
      );
    } else {
      console.log(
        `[Restore Default Org Stripe] No-op: '${TARGET_ORG_ID}' already has a connected account or row missing.`,
      );
    }
  } catch (err) {
    console.error('[Restore Default Org Stripe] Failed:', err);
  }
}
