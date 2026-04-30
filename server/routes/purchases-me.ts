import type { Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { storage } from "../storage";
import { productEnrollments } from "@shared/schema";

// Task #343: Per-player purchase status. The Payments tab now renders one
// MyPurchasesCard per child and passes that child's club via
// `?organizationId=`. Multi-club households need each tab to show the
// active / pending / expired badges for THAT child's club only — the prior
// unscoped behaviour either bled purchases across clubs or (when the route
// was missing entirely) silently showed nothing. Mirror the org guard from
// GET /api/programs and resolve the household's account-holder root so a
// parent sees every child's purchases regardless of which profile they
// signed in under.
//
// Extracted from routes.ts in Task #346 so the org-scoping rule and
// best-status-wins grouping can be exercised by integration tests without
// having to spin up the full Express app graph.

async function userHasAdminProfile(userId: string, organizationId: string): Promise<boolean> {
  try {
    const currentUser = await storage.getUser(userId);
    if (!currentUser?.email) return false;
    const allUsers = await storage.getUsersByOrganization(organizationId);
    return allUsers.some(
      (u: any) => u.email === currentUser.email && u.role === "admin",
    );
  } catch (error) {
    console.error("Error checking admin profile:", error);
    return false;
  }
}

export async function purchasesMeHandler(req: Request & { user?: any }, res: Response) {
  try {
    const userId = req.user.id;
    const sessionOrgId = req.user.organizationId || "default-org";
    const requestedOrgId =
      typeof req.query.organizationId === "string" && req.query.organizationId.length > 0
        ? req.query.organizationId
        : null;

    if (requestedOrgId && requestedOrgId !== sessionOrgId) {
      const isAdminOfTarget =
        (req.user.role === "admin" && sessionOrgId === requestedOrgId) ||
        (await userHasAdminProfile(userId, requestedOrgId));
      let allowed = isAdminOfTarget;
      if (!allowed) {
        const linkedPlayers = await storage.getPlayersByParent(userId);
        allowed = linkedPlayers.some((p: any) => p.organizationId === requestedOrgId);
      }
      if (!allowed) {
        return res
          .status(403)
          .json({ message: "You do not have access to this organization" });
      }
    }

    const currentUser = await storage.getUser(userId);
    const rootAccountHolderId = currentUser?.accountHolderId || userId;

    const conditions = [eq(productEnrollments.accountHolderId, rootAccountHolderId)];
    if (requestedOrgId) {
      conditions.push(eq(productEnrollments.organizationId, requestedOrgId));
    }

    const rows = await db
      .select({
        programId: productEnrollments.programId,
        status: productEnrollments.status,
        startDate: productEnrollments.startDate,
        endDate: productEnrollments.endDate,
        gracePeriodEndDate: productEnrollments.gracePeriodEndDate,
        createdAt: productEnrollments.createdAt,
      })
      .from(productEnrollments)
      .where(and(...conditions));

    type Bucket = "active" | "pending" | "expired";
    const rank: Record<Bucket, number> = { active: 3, pending: 2, expired: 1 };
    const best = new Map<
      string,
      { status: Bucket; purchasedAt?: string; expiresAt?: string }
    >();

    for (const row of rows) {
      let bucket: Bucket;
      switch (row.status) {
        case "active":
        case "grace_period":
          bucket = "active";
          break;
        case "pending":
          bucket = "pending";
          break;
        default:
          // 'expired', 'cancelled', and any unknown legacy values
          bucket = "expired";
          break;
      }
      const purchasedAt = row.startDate ?? row.createdAt ?? undefined;
      const expiresAt = row.endDate ?? row.gracePeriodEndDate ?? undefined;
      const existing = best.get(row.programId);
      if (!existing || rank[bucket] > rank[existing.status]) {
        best.set(row.programId, {
          status: bucket,
          purchasedAt: purchasedAt ?? undefined,
          expiresAt: expiresAt ?? undefined,
        });
      }
    }

    const purchases = Array.from(best.entries()).map(([productId, v]) => ({
      productId,
      status: v.status,
      purchasedAt: v.purchasedAt,
      expiresAt: v.expiresAt,
    }));

    res.json(purchases);
  } catch (error: any) {
    console.error("Error fetching /api/purchases/me:", error);
    res.status(500).json({ message: "Failed to fetch purchase status" });
  }
}
