import type { Response } from "express";
import { db } from "./db";
import { productEnrollments, users } from "@shared/schema";
import { eq, or, isNull, and } from "drizzle-orm";
import {
  evaluatePlayerAccess,
  ACCESS_DENIED_ERROR_CODE,
  type PlayerAccess,
} from "@shared/access-gate";

/**
 * Resolve the account holder ID for a given user. Mirrors the logic the
 * /api/enrollments route uses so account-wide enrollments are picked up no
 * matter which profile the request authenticated as.
 */
async function resolveAccountHolderId(userId: string): Promise<string> {
  const rows = await db
    .select({ accountHolderId: users.accountHolderId, parentId: users.parentId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return rows[0]?.accountHolderId || rows[0]?.parentId || userId;
}

/**
 * Load every enrollment that governs a given player's access: their direct
 * profile-level rows plus any account-wide rows owned by their account holder.
 */
async function loadPlayerEnrollments(playerId: string): Promise<any[]> {
  const accountHolderId = await resolveAccountHolderId(playerId);
  const rows = await db
    .select()
    .from(productEnrollments)
    .where(
      or(
        eq(productEnrollments.profileId, playerId),
        and(
          eq(productEnrollments.accountHolderId, accountHolderId),
          isNull(productEnrollments.profileId),
        ),
      ),
    );
  return rows.map((r: any) => ({ ...r, accountHolderId: r.accountHolderId ?? accountHolderId }));
}

/**
 * Compute the unified access decision for a player. Used by both the
 * GET /api/access/player/:playerId? endpoint and the inline route guards so
 * the rule lives in exactly one place.
 */
export async function getPlayerAccess(playerId: string): Promise<PlayerAccess> {
  const enrollments = await loadPlayerEnrollments(playerId);
  const accountHolderId = enrollments[0]?.accountHolderId ?? null;
  return evaluatePlayerAccess(enrollments, playerId, accountHolderId);
}

/**
 * Helper used inside route handlers to enforce enrollment access for the
 * player who would actually use the feature. Coaches, admins, and parents
 * are always allowed through — only the player's own interactive use is
 * gated, matching the task scope. Returns true when the request was rejected
 * (and the caller should `return`).
 */
export async function rejectIfNoPlayerAccess(
  req: any,
  res: Response,
  options: { playerId?: string; bypassRoles?: string[]; ignoreRoleBypass?: boolean } = {},
): Promise<boolean> {
  const role = req?.user?.role;
  const bypassRoles = options.bypassRoles ?? ["admin", "coach", "parent"];
  if (!options.ignoreRoleBypass && role && bypassRoles.includes(role)) return false;
  // Admins and coaches always pass through, even when caller asks us to
  // ignore the role bypass — they're never the "affected player".
  if (role === "admin" || role === "coach") return false;
  const playerId = options.playerId || req?.user?.id;
  if (!playerId) return false;
  const access = await getPlayerAccess(playerId);
  if (access.canAccess) return false;
  res.status(403).json({
    error: ACCESS_DENIED_ERROR_CODE,
    message: access.message,
    reason: access.reason,
    accessUntil: access.accessUntil,
  });
  return true;
}

export { ACCESS_DENIED_ERROR_CODE };
