import { and, eq, inArray, or, sql } from 'drizzle-orm';
import type Stripe from 'stripe';
import { db } from '../db';
import {
  adminRemovalAudits,
  organizations,
  productEnrollments,
  teamMemberships,
  teams,
  users,
  waiverSignatures,
} from '@shared/schema';

// Either the top-level db handle or the inner transaction handle drizzle
// hands to the `db.transaction(async (tx) => ...)` callback. Both support
// the same chainable update/select/insert API surface, so we accept either.
type Database = typeof db;
type DbTransaction = Parameters<Parameters<Database['transaction']>[0]>[0];
type DbOrTx = Database | DbTransaction;

export interface OrgRemovalSummary {
  targetUserId: string;
  targetName: string;
  targetEmail: string | null;
  removedPlayers: Array<{ id: string; name: string }>;
  cancelledEnrollmentIds: number[];
  endedTeamMembershipCount: number;
  cancelledStripeSubscriptionCount: number;
  // True only when the SYSTEM day-45 cleanup actually soft-deletes the
  // account. For manual admin removals this is always false because the
  // account is preserved (only the org link is severed).
  parentSoftDeleted: boolean;
  // When the parent isn't soft-deleted and their primary org is the
  // org they're being removed from, we either re-home them to an
  // other-org child's org (if any) or null out their organizationId
  // entirely. Carries the new orgId or null.
  parentReassignedToOrgId: string | null;
  // True when the parent's primary `organizationId` was cleared (set to
  // null) because the manual flow had no other-org children to re-home
  // them to. The account stays alive (not soft-deleted).
  parentDetached: boolean;
  childrenSoftDeleted: number;
  // Children who had this org as their primary org and were detached
  // (organizationId nulled, memberships ended) instead of soft-deleted.
  // Manual flow always uses this; system cleanup uses childrenSoftDeleted.
  childrenDetached: number;
  otherOrgPlayerCount: number;
  otherOrgPlayerNames: string[];
  // Distinct names of the other clubs this parent has children in.
  // Surfaced in the admin confirmation so they understand which other
  // clubs will continue managing the household.
  otherOrgNames: string[];
}

interface OrgRemovalDeps {
  getStripeForOrg?: (organizationId: string) => Promise<Stripe | null>;
}

export interface RemovalOptions extends OrgRemovalDeps {
  // When true (system-only, used by the day-45 orphan auto-cleanup) the
  // service is allowed to soft-delete the underlying user row when their
  // primary org is the org being removed AND they have no presence in
  // any other org. When false (the default for admin "remove from this
  // club" actions) the user account is NEVER touched — we only detach
  // the org-scoped relationships (memberships, enrollments, org link).
  // This separation keeps the manual flow non-destructive while still
  // letting the auto-cleanup permanently retire abandoned accounts.
  softDeleteIfFinalOrg?: boolean;
}

function fullName(u: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  id: string;
}): string {
  const parts = [u.firstName, u.lastName].filter(
    (v): v is string => typeof v === 'string' && v.trim().length > 0,
  );
  if (parts.length > 0) return parts.join(' ').trim();
  return u.email || u.id;
}

/**
 * Soft-delete a user record using the same primitive used by the
 * "delete my account" flow: keep the row (so historical references still
 * resolve), strip identifying data, mask the email so the address can be
 * reused, and clear out auth tokens so the row cannot be claimed.
 */
export async function softDeleteUserRow(
  tx: DbOrTx,
  userId: string,
  email: string | null,
): Promise<void> {
  const masked = `deleted_${userId}@deleted.local`;
  await tx
    .update(users)
    .set({
      isActive: false,
      email: email ? masked : null,
      passwordResetToken: null,
      passwordResetExpiry: null,
      magicLinkToken: null,
      magicLinkExpiry: null,
      verificationToken: null,
      verificationExpiry: null,
      inviteToken: null,
      inviteTokenExpiry: null,
      hasRegistered: false,
      status: 'removed',
      organizationId: null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, userId));
}

/**
 * Cancel any active Stripe subscriptions backing a set of enrollments.
 * Stripe failures never block the local removal — they're surfaced via the
 * returned counters and logged.
 */
async function cancelStripeForEnrollments(
  enrollments: Array<{ id: number; stripeSubscriptionId: string | null }>,
  organizationId: string,
  getStripeForOrg: OrgRemovalDeps['getStripeForOrg'],
): Promise<number> {
  if (!getStripeForOrg) return 0;
  let cancelled = 0;
  let stripeInstance: Stripe | null = null;
  for (const e of enrollments) {
    if (!e.stripeSubscriptionId) continue;
    try {
      if (!stripeInstance) {
        stripeInstance = await getStripeForOrg(organizationId);
      }
      if (!stripeInstance) continue;
      await stripeInstance.subscriptions.cancel(e.stripeSubscriptionId);
      cancelled += 1;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[org-removal] Failed to cancel Stripe subscription ${e.stripeSubscriptionId} (enrollment ${e.id}) for org ${organizationId}: ${msg}`,
      );
    }
  }
  return cancelled;
}

/**
 * Player-scope preview: the target itself is the "removed player".
 * Counts the target's in-org enrollments + memberships exactly as
 * removePlayerFromOrg would touch them.
 */
async function previewPlayerRemoval(
  target: typeof users.$inferSelect,
  organizationId: string,
): Promise<OrgRemovalSummary> {
  const enrollments = await db
    .select({
      id: productEnrollments.id,
      stripeSubscriptionId: productEnrollments.stripeSubscriptionId,
    })
    .from(productEnrollments)
    .where(
      and(
        eq(productEnrollments.organizationId, organizationId),
        eq(productEnrollments.profileId, target.id),
        sql`${productEnrollments.status} <> 'cancelled'`,
      ),
    );

  const orgTeamIdsRows = await db
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.organizationId, organizationId));
  const orgTeamIds = orgTeamIdsRows.map((t) => t.id);

  const memberships = orgTeamIds.length === 0
    ? []
    : await db
        .select({ id: teamMemberships.id })
        .from(teamMemberships)
        .where(
          and(
            eq(teamMemberships.profileId, target.id),
            inArray(teamMemberships.teamId, orgTeamIds),
            eq(teamMemberships.status, 'active'),
          ),
        );

  const isPrimaryOrg = target.organizationId === organizationId;
  return {
    targetUserId: target.id,
    targetName: fullName(target),
    targetEmail: target.email ?? null,
    removedPlayers: [{ id: target.id, name: fullName(target) }],
    cancelledEnrollmentIds: enrollments.map((e) => e.id),
    endedTeamMembershipCount: memberships.length,
    cancelledStripeSubscriptionCount: enrollments.filter((e) => e.stripeSubscriptionId).length,
    parentSoftDeleted: false,
    parentReassignedToOrgId: null,
    parentDetached: isPrimaryOrg,
    childrenSoftDeleted: 0,
    childrenDetached: 0,
    otherOrgPlayerCount: 0,
    otherOrgPlayerNames: [],
    otherOrgNames: [],
  };
}

/**
 * Compute the org-scoped impact of removing this user without making any
 * changes. Used by both the preview endpoint and the executor so the
 * numbers shown in the confirm dialog match what actually happens.
 *
 * If `scope === 'player'` the preview describes a single-player removal:
 * the target itself is the "removed player" and household linkage is
 * ignored. Otherwise the parent-household preview (children, other-org
 * presence, etc.) is computed.
 */
export async function previewRemoval(
  targetUserId: string,
  organizationId: string,
  scope: 'parent' | 'player' = 'parent',
): Promise<OrgRemovalSummary | null> {
  const [target] = await db.select().from(users).where(eq(users.id, targetUserId));
  if (!target) return null;

  // Player-scope preview: the target IS the only "removed player". We
  // count their own in-org enrollments + memberships, NOT their
  // household siblings. This mirrors removePlayerFromOrg exactly so the
  // dialog count matches the executor.
  if (scope === 'player') {
    return previewPlayerRemoval(target, organizationId);
  }

  // In-org children: strict org match. We do NOT include NULL-org rows
  // (those belong to no club and aren't "in this club"). The day-45
  // orphan cleanup handles abandoned NULL-org rows separately.
  const inOrgChildren = await db
    .select()
    .from(users)
    .where(
      and(
        sql`(${users.accountHolderId} = ${targetUserId} OR ${users.parentId} = ${targetUserId} OR ${users.guardianId} = ${targetUserId})`,
        eq(users.organizationId, organizationId),
        eq(users.isActive, true),
      ),
    );

  // Other-org players: same parent linkage but a *different* org. We never
  // touch these — they are surfaced to the admin so they understand the
  // household has presence elsewhere.
  const otherOrgChildren = await db
    .select()
    .from(users)
    .where(
      and(
        sql`(${users.accountHolderId} = ${targetUserId} OR ${users.parentId} = ${targetUserId} OR ${users.guardianId} = ${targetUserId})`,
        sql`${users.organizationId} IS NOT NULL AND ${users.organizationId} <> ${organizationId}`,
        eq(users.isActive, true),
      ),
    );

  const householdIds = [target.id, ...inOrgChildren.map((c) => c.id)];

  const enrollments = await db
    .select({
      id: productEnrollments.id,
      stripeSubscriptionId: productEnrollments.stripeSubscriptionId,
    })
    .from(productEnrollments)
    .where(
      and(
        eq(productEnrollments.organizationId, organizationId),
        or(inArray(productEnrollments.profileId, householdIds), inArray(productEnrollments.accountHolderId, householdIds)),
        sql`${productEnrollments.status} <> 'cancelled'`,
      ),
    );

  const memberships = await db
    .select({ id: teamMemberships.id })
    .from(teamMemberships)
    .innerJoin(teams, eq(teams.id, teamMemberships.teamId))
    .where(
      and(
        inArray(teamMemberships.profileId, householdIds),
        eq(teams.organizationId, organizationId),
        eq(teamMemberships.status, 'active'),
      ),
    );

  // Resolve distinct other-org names for display. We do this in a single
  // round-trip so the dialog can say "active in 'Flowstate Performance'"
  // instead of just listing player names.
  const distinctOtherOrgIds = Array.from(
    new Set(
      otherOrgChildren
        .map((c) => c.organizationId)
        .filter((v): v is string => typeof v === 'string' && v.length > 0),
    ),
  );
  const otherOrgNames =
    distinctOtherOrgIds.length > 0
      ? (
          await db
            .select({ id: organizations.id, name: organizations.name })
            .from(organizations)
            .where(inArray(organizations.id, distinctOtherOrgIds))
        ).map((o) => o.name)
      : [];

  // The MANUAL flow never soft-deletes; it always detaches. The preview's
  // `parentSoftDeleted` therefore stays false here. The system day-45
  // cleanup uses its own variant of these primitives that flips
  // soft-delete on for the final-org case.
  const parentSoftDeleted = false;

  // If the parent's primary org is this org we either re-home them to an
  // other-org child's org (preferred — they keep an active membership
  // somewhere) or, when there's nowhere to re-home, null out their
  // organizationId entirely. Both keep the account alive but drop them
  // from this org's user listings.
  let parentReassignedToOrgId: string | null = null;
  let parentDetached = false;
  if (target.organizationId === organizationId) {
    const fallbackOrg = otherOrgChildren.find((c) => !!c.organizationId)?.organizationId ?? null;
    parentReassignedToOrgId = fallbackOrg;
    parentDetached = fallbackOrg === null;
  }

  return {
    targetUserId: target.id,
    targetName: fullName(target),
    targetEmail: target.email ?? null,
    removedPlayers: inOrgChildren.map((c) => ({ id: c.id, name: fullName(c) })),
    cancelledEnrollmentIds: enrollments.map((e) => e.id),
    endedTeamMembershipCount: memberships.length,
    cancelledStripeSubscriptionCount: enrollments.filter((e) => e.stripeSubscriptionId).length,
    parentSoftDeleted,
    parentReassignedToOrgId,
    parentDetached,
    childrenSoftDeleted: 0,
    childrenDetached: inOrgChildren.length,
    otherOrgPlayerCount: otherOrgChildren.length,
    otherOrgPlayerNames: otherOrgChildren.map(fullName),
    otherOrgNames,
  };
}

/**
 * Org-scoped removal of a parent (and their in-org household) from the
 * given organization. Idempotent in spirit: cancelling already-cancelled
 * enrollments and inactivating already-inactive memberships are no-ops.
 *
 * Stripe cancellation runs *outside* the DB transaction so a webhook
 * timeout never blocks local cleanup.
 */
export async function removeParentFromOrg(
  parentId: string,
  organizationId: string,
  actorId: string | null,
  options: RemovalOptions = {},
): Promise<OrgRemovalSummary> {
  const { softDeleteIfFinalOrg = false, ...deps } = options;
  const preview = await previewRemoval(parentId, organizationId);
  if (!preview) throw new Error('User not found');

  const householdIds = [preview.targetUserId, ...preview.removedPlayers.map((p) => p.id)];
  // Final-org check only applies when the system cleanup wants to
  // soft-delete: parent's primary org is this org AND no other-org
  // children exist.
  const isFinalOrg =
    preview.otherOrgPlayerCount === 0 && preview.parentDetached;
  const willSoftDeleteParent = softDeleteIfFinalOrg && isFinalOrg;

  // Pull stripe sub ids before we cancel — we cancel rows then call Stripe
  // with the captured list, so Stripe failures don't reopen DB rows.
  const enrollmentRows = await db
    .select({
      id: productEnrollments.id,
      stripeSubscriptionId: productEnrollments.stripeSubscriptionId,
    })
    .from(productEnrollments)
    .where(
      and(
        eq(productEnrollments.organizationId, organizationId),
        or(inArray(productEnrollments.profileId, householdIds), inArray(productEnrollments.accountHolderId, householdIds)),
        sql`${productEnrollments.status} <> 'cancelled'`,
      ),
    );

  const nowIso = new Date().toISOString();

  await db.transaction(async (tx) => {
    if (enrollmentRows.length > 0) {
      await tx
        .update(productEnrollments)
        .set({ status: 'cancelled', autoRenew: false, updatedAt: nowIso })
        .where(
          inArray(
            productEnrollments.id,
            enrollmentRows.map((e) => e.id),
          ),
        );
    }

    // End in-org team memberships only.
    const orgTeamIdsRows = await tx
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.organizationId, organizationId));
    const orgTeamIds = orgTeamIdsRows.map((t) => t.id);
    if (orgTeamIds.length > 0) {
      await tx
        .update(teamMemberships)
        .set({ status: 'inactive' })
        .where(
          and(
            inArray(teamMemberships.profileId, householdIds),
            inArray(teamMemberships.teamId, orgTeamIds),
          ),
        );
    }

    // Detach in-org children: clear their org link + team/division refs.
    // We do NOT soft-delete child accounts in the manual flow — they
    // remain intact so the parent can re-attach them to another club
    // later. The system day-45 cleanup soft-deletes children only as
    // part of the parent soft-delete path.
    if (preview.removedPlayers.length > 0) {
      if (willSoftDeleteParent) {
        for (const child of preview.removedPlayers) {
          const [row] = await tx.select().from(users).where(eq(users.id, child.id));
          if (row) await softDeleteUserRow(tx, child.id, row.email ?? null);
        }
      } else {
        await tx
          .update(users)
          .set({
            organizationId: null,
            teamId: null,
            divisionId: null,
            updatedAt: nowIso,
          })
          .where(
            inArray(
              users.id,
              preview.removedPlayers.map((c) => c.id),
            ),
          );
      }
    }

    // Parent handling:
    //   - System cleanup (willSoftDeleteParent): close the account.
    //   - Manual flow: never close. If their primary org is this org we
    //     re-home them to an other-org child (preserves a real org link)
    //     or null out their organizationId entirely. If parent's primary
    //     org is a DIFFERENT club, leave the parent row untouched —
    //     teamId/divisionId belong to that other club's context and
    //     this admin must not mutate them.
    if (willSoftDeleteParent) {
      await softDeleteUserRow(tx, preview.targetUserId, preview.targetEmail);
    } else if (preview.parentDetached || preview.parentReassignedToOrgId !== null) {
      const parentUpdate: Record<string, unknown> = {
        teamId: null,
        divisionId: null,
        updatedAt: nowIso,
      };
      if (preview.parentReassignedToOrgId !== null) {
        parentUpdate.organizationId = preview.parentReassignedToOrgId;
      } else {
        parentUpdate.organizationId = null;
      }
      await tx.update(users).set(parentUpdate).where(eq(users.id, preview.targetUserId));
    }
    // else: parent's primary org is a different club — do not touch
    // their row. We only detached the children/enrollments belonging to
    // this admin's org above.

    // Audit ownership: the manual flow always writes its own audit row
    // here. The system day-45 cleanup (softDeleteIfFinalOrg=true) skips
    // this internal audit so the scheduler can write a single richer
    // audit row that includes remindersSent/baselineAt context — no
    // duplicates.
    if (!softDeleteIfFinalOrg) {
      await tx.insert(adminRemovalAudits).values({
        organizationId,
        action: 'remove_parent_from_org',
        actorId,
        targetUserId: preview.targetUserId,
        details: {
          playerIds: preview.removedPlayers.map((p) => p.id),
          playerNames: preview.removedPlayers.map((p) => p.name),
          enrollmentIds: enrollmentRows.map((e) => e.id),
          teamMembershipCount: preview.endedTeamMembershipCount,
          otherOrgPlayerCount: preview.otherOrgPlayerCount,
          otherOrgPlayerNames: preview.otherOrgPlayerNames,
          parentSoftDeleted: false,
          parentDetached: preview.parentDetached,
          parentReassignedToOrgId: preview.parentReassignedToOrgId,
          childrenDetached: preview.removedPlayers.length,
          childrenSoftDeleted: 0,
        } as Record<string, unknown>,
      });
    }
  });

  const stripeCancelled = await cancelStripeForEnrollments(
    enrollmentRows,
    organizationId,
    deps.getStripeForOrg,
  );

  return {
    ...preview,
    cancelledStripeSubscriptionCount: stripeCancelled,
  };
}

/**
 * Single-player variant of the parent removal. Used when an admin only
 * wants to drop one child from the club (parent and siblings stay).
 */
export async function removePlayerFromOrg(
  playerId: string,
  organizationId: string,
  actorId: string | null,
  options: RemovalOptions = {},
): Promise<OrgRemovalSummary> {
  const { softDeleteIfFinalOrg = false, ...deps } = options;
  const [player] = await db.select().from(users).where(eq(users.id, playerId));
  if (!player) throw new Error('Player not found');

  const enrollmentRows = await db
    .select({
      id: productEnrollments.id,
      stripeSubscriptionId: productEnrollments.stripeSubscriptionId,
    })
    .from(productEnrollments)
    .where(
      and(
        eq(productEnrollments.organizationId, organizationId),
        eq(productEnrollments.profileId, playerId),
        sql`${productEnrollments.status} <> 'cancelled'`,
      ),
    );

  const orgTeamIdsRows = await db
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.organizationId, organizationId));
  const orgTeamIds = orgTeamIdsRows.map((t) => t.id);

  const memberships = await db
    .select({ id: teamMemberships.id })
    .from(teamMemberships)
    .where(
      and(
        eq(teamMemberships.profileId, playerId),
        orgTeamIds.length > 0 ? inArray(teamMemberships.teamId, orgTeamIds) : sql`false`,
        eq(teamMemberships.status, 'active'),
      ),
    );

  const nowIso = new Date().toISOString();

  await db.transaction(async (tx) => {
    if (enrollmentRows.length > 0) {
      await tx
        .update(productEnrollments)
        .set({ status: 'cancelled', autoRenew: false, updatedAt: nowIso })
        .where(
          inArray(
            productEnrollments.id,
            enrollmentRows.map((e) => e.id),
          ),
        );
    }

    if (orgTeamIds.length > 0) {
      await tx
        .update(teamMemberships)
        .set({ status: 'inactive' })
        .where(
          and(
            eq(teamMemberships.profileId, playerId),
            inArray(teamMemberships.teamId, orgTeamIds),
          ),
        );
    }

    // Sever the player from this org. Manual flow: detach (clear org +
    // team refs) and keep the account alive. System cleanup (rare for
    // single-player path): soft-delete only when explicitly opted-in
    // AND the player has no other-org presence.
    const isPrimaryOrg = player.organizationId === organizationId;
    if (softDeleteIfFinalOrg && isPrimaryOrg) {
      await softDeleteUserRow(tx, playerId, player.email ?? null);
    } else {
      await tx
        .update(users)
        .set({
          teamId: null,
          divisionId: null,
          ...(isPrimaryOrg ? { organizationId: null } : {}),
          updatedAt: nowIso,
        })
        .where(eq(users.id, playerId));
    }

    await tx.insert(adminRemovalAudits).values({
      organizationId,
      action: 'remove_player_from_org',
      actorId,
      targetUserId: playerId,
      details: {
        playerIds: [playerId],
        playerNames: [fullName(player)],
        enrollmentIds: enrollmentRows.map((e) => e.id),
        teamMembershipCount: memberships.length,
        playerSoftDeleted: softDeleteIfFinalOrg && isPrimaryOrg,
        playerDetached: !(softDeleteIfFinalOrg && isPrimaryOrg),
      } as Record<string, unknown>,
    });
  });

  const stripeCancelled = await cancelStripeForEnrollments(
    enrollmentRows,
    organizationId,
    deps.getStripeForOrg,
  );

  const isPrimaryOrg = player.organizationId === organizationId;
  const playerSoftDeleted = softDeleteIfFinalOrg && isPrimaryOrg;
  return {
    targetUserId: playerId,
    targetName: fullName(player),
    targetEmail: player.email ?? null,
    removedPlayers: [{ id: playerId, name: fullName(player) }],
    cancelledEnrollmentIds: enrollmentRows.map((e) => e.id),
    endedTeamMembershipCount: memberships.length,
    cancelledStripeSubscriptionCount: stripeCancelled,
    parentSoftDeleted: playerSoftDeleted,
    parentReassignedToOrgId: null,
    parentDetached: !playerSoftDeleted && isPrimaryOrg,
    childrenSoftDeleted: 0,
    childrenDetached: 0,
    otherOrgPlayerCount: 0,
    otherOrgPlayerNames: [],
    otherOrgNames: [],
  };
}

// Suppress unused-import lint by re-exporting the audit table for callers
// that want to query it directly.
export { adminRemovalAudits, waiverSignatures };
