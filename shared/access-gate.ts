import {
  computeAccessStatus,
  type AccessStatus,
  type AccessStatusInput,
  type AccessReason,
} from "./access-status";

export interface PlayerAccess {
  canAccess: boolean;
  reason: AccessReason;
  accessUntil: string | null;
  sourceLabel: string;
  message: string;
}

const DENY_MESSAGES: Record<AccessReason, string> = {
  paid: "",
  admin_grant: "",
  grace: "Your enrollment is in the grace period — pay now to keep access.",
  expired: "Your enrollment has ended. Renew to keep using this feature.",
  none: "You don't have an active enrollment yet. Pay or claim a plan to unlock this feature.",
};

export interface PlayerEnrollmentLike extends AccessStatusInput {
  profileId?: string | null;
  accountHolderId?: string | null;
}

/**
 * Filter a parent/account holder's enrollments down to the rows that govern a
 * specific player's access. Mirrors the logic the unified expiry banner uses:
 * an enrollment counts when it directly targets the player's profile, OR when
 * it's an account-wide enrollment (no profileId) on the player's account.
 */
export function filterEnrollmentsForPlayer<T extends PlayerEnrollmentLike>(
  enrollments: T[] | null | undefined,
  playerId: string,
  accountHolderId?: string | null,
): T[] {
  if (!enrollments || enrollments.length === 0) return [];
  return enrollments.filter((e) => {
    if (e.profileId && e.profileId === playerId) return true;
    if (!e.profileId) {
      // Account-wide enrollment counts when it belongs to the player's
      // account holder. When we don't know the holder, accept it (callers are
      // expected to have already scoped the rows to the right account).
      if (!accountHolderId) return true;
      return e.accountHolderId === accountHolderId;
    }
    return false;
  });
}

/**
 * Decide whether a player should be allowed into a gated feature based on the
 * unified access status. Active enrollments (paid or admin grant) unlock the
 * feature; grace period, expired, and missing enrollments are blocked with a
 * plain-English reason matching the AccessUntilLine wording.
 */
export function evaluatePlayerAccess<T extends PlayerEnrollmentLike>(
  enrollments: T[] | null | undefined,
  playerId: string,
  accountHolderId?: string | null,
): PlayerAccess {
  const scoped = filterEnrollmentsForPlayer(enrollments, playerId, accountHolderId);
  const status: AccessStatus = computeAccessStatus(scoped);
  const canAccess = status.reason === "paid" || status.reason === "admin_grant";
  return {
    canAccess,
    reason: status.reason,
    accessUntil: status.accessUntil,
    sourceLabel: status.sourceLabel,
    message: canAccess ? "" : DENY_MESSAGES[status.reason],
  };
}

export const ACCESS_DENIED_ERROR_CODE = "ENROLLMENT_ACCESS_DENIED";
