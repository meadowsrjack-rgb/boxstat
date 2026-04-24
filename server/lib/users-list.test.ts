import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import express, { type RequestHandler } from "express";
import type { AddressInfo } from "net";
import { Server } from "http";
import { registerUsersListRoute, type UsersListDeps, type UsersListEntry } from "./users-list";
import type { SelectUser } from "@shared/schema";

type HouseholdSeed = Pick<SelectUser, "id" | "role" | "organizationId" | "accountHolderId" | "parentId" | "email">;

/**
 * Task #310 endpoint-level regression test for the bug fixed in Task #308:
 * the admin Users tab (`GET /api/users`) must include household players
 * whose `accountHolderId` points at a sibling profile (e.g. an admin/coach
 * role of the same human) and players whose `organizationId` is null.
 *
 * This stands up the actual Express route registered by
 * `registerUsersListRoute` against in-memory mock storage and a fake
 * household fetcher that mimics the production org-scoped DB query, so the
 * test exercises the real route contract end-to-end.
 */

const ORG = "org-1";
const OTHER_ORG = "org-2";

// Household for the parent "Alex":
//   parent-alex          — parent, in ORG (canonical root, returned by getUsersByOrganization)
//   admin-alex           — same human, admin role, in ORG, accountHolderId=parent-alex
//   coach-alex           — same human, coach role, in ORG, accountHolderId=parent-alex
//   player-sam           — child whose accountHolderId points at the admin sibling
//                          profile (the bug case), organizationId=ORG. Returned by
//                          getUsersByOrganization, but the bug pre-fix was that the
//                          family grouping ignored it because its account holder
//                          wasn't the root parent.
//   player-jordan        — child with organizationId=null (the other bug case),
//                          accountHolderId=parent-alex. NOT in getUsersByOrganization
//                          and only reached via the household expansion fetcher.
//   player-riley         — child reached via parent-alex through parentId instead of
//                          accountHolderId, organizationId=null. Also only reached
//                          via the household expansion.
//   stranger             — unrelated parent in ORG; no children.
//   foreign-player       — child of parent-alex but explicitly assigned to a
//                          DIFFERENT org; must NOT leak into the response.
const HOUSEHOLD: HouseholdSeed[] = [
  { id: "parent-alex", role: "parent", organizationId: ORG, accountHolderId: null, parentId: null, email: "alex@example.com" },
  { id: "admin-alex", role: "admin", organizationId: ORG, accountHolderId: "parent-alex", parentId: null, email: "alex@example.com" },
  { id: "coach-alex", role: "coach", organizationId: ORG, accountHolderId: "parent-alex", parentId: null, email: "alex@example.com" },
  { id: "player-sam", role: "player", organizationId: ORG, accountHolderId: "admin-alex", parentId: null, email: null },
  { id: "player-jordan", role: "player", organizationId: null, accountHolderId: "parent-alex", parentId: null, email: null },
  { id: "player-riley", role: "player", organizationId: null, accountHolderId: null, parentId: "parent-alex", email: null },
  { id: "stranger", role: "parent", organizationId: ORG, accountHolderId: null, parentId: null, email: "stranger@example.com" },
  { id: "foreign-player", role: "player", organizationId: OTHER_ORG, accountHolderId: "parent-alex", parentId: null, email: null },
];

// The mock storage returns SelectUser-shaped rows. The seed only fills the
// fields the route exercises; everything else is left undefined and is fine
// because the route never reads it for a default-shaped row.
const seedAsUser = (seed: HouseholdSeed): SelectUser => seed as unknown as SelectUser;

// Note on the seed shape: `storage.getUsersByOrganization(ORG)` only returns
// users explicitly tagged with this org. Crucially, that excludes
// player-jordan and player-riley (organizationId=null) — they only show up
// after the household expansion runs against `fetchHouseholdExtras`.

function buildMockDeps(): UsersListDeps {
  // Same shape as the production DB query: rows linked to the frontier
  // through accountHolderId or parentId, restricted to the same org or
  // org-null.
  const fetchHouseholdExtras = vi.fn(async (organizationId: string, frontierIds: string[]) => {
    const set = new Set(frontierIds);
    return HOUSEHOLD.filter((u) => {
      const linksToFrontier =
        (u.accountHolderId && set.has(u.accountHolderId)) ||
        (u.parentId && set.has(u.parentId));
      if (!linksToFrontier) return false;
      return u.organizationId === organizationId || u.organizationId == null;
    }).map(seedAsUser);
  });

  return {
    storage: {
      getUsersByOrganization: vi.fn(async (orgId: string) => {
        return HOUSEHOLD.filter((u) => u.organizationId === orgId).map(seedAsUser);
      }),
      getTeamsByOrganization: vi.fn(async () => []),
      getProgramsByOrganization: vi.fn(async () => []),
      getPlayerStatusTagsBulk: vi.fn(async () => new Map()),
    },
    fetchHouseholdExtras,
    fetchActiveTeamMemberships: vi.fn(async () => []),
  };
}

// Stub auth middleware that mimics requireAuth's contract: attaches a
// req.user with id/organizationId/role pulled from a header so individual
// tests can simulate different sessions without standing up real JWTs.
interface StubReq extends Express.Request {
  user?: { id: string; organizationId: string; role: string; claims: { sub: string } };
  headers: Record<string, string | string[] | undefined>;
}
const stubAuth: RequestHandler = (req, res, next) => {
  const r = req as unknown as StubReq;
  const userId = r.headers["x-test-user-id"] as string | undefined;
  const organizationId = r.headers["x-test-org-id"] as string | undefined;
  const role = (r.headers["x-test-role"] as string | undefined) || "admin";
  if (!userId || !organizationId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  r.user = { id: userId, organizationId, role, claims: { sub: userId } };
  next();
};

describe("GET /api/users (Task #308 endpoint regression)", () => {
  let server: Server;
  let baseUrl: string;
  let deps: UsersListDeps;

  beforeAll(async () => {
    deps = buildMockDeps();
    const app = express();
    registerUsersListRoute(app, { authMiddleware: stubAuth, deps });
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => resolve());
    });
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  async function getUsersAsAdmin(): Promise<UsersListEntry[]> {
    const res = await fetch(`${baseUrl}/api/users`, {
      headers: {
        "x-test-user-id": "parent-alex",
        "x-test-org-id": ORG,
        "x-test-role": "admin",
      },
    });
    expect(res.status).toBe(200);
    return (await res.json()) as UsersListEntry[];
  }

  it("rejects unauthenticated requests", async () => {
    const res = await fetch(`${baseUrl}/api/users`);
    expect(res.status).toBe(401);
  });

  it("returns every household player to an admin, including the sibling-linked and null-org cases", async () => {
    const body = await getUsersAsAdmin();
    const ids = new Set(body.map((u) => u.id));
    expect(ids.has("player-sam")).toBe(true);    // sibling-linked player
    expect(ids.has("player-jordan")).toBe(true); // null-org player linked via accountHolderId
    expect(ids.has("player-riley")).toBe(true);  // null-org player linked via parentId

    const playerIds = body.filter((u) => u.role === "player").map((u) => u.id).sort();
    expect(playerIds).toEqual(["player-jordan", "player-riley", "player-sam"]);
  });

  it("includes the canonical parent and sibling admin/coach rows alongside the players", async () => {
    const body = await getUsersAsAdmin();
    const ids = new Set(body.map((u) => u.id));
    expect(ids.has("parent-alex")).toBe(true);
    expect(ids.has("admin-alex")).toBe(true);
    expect(ids.has("coach-alex")).toBe(true);
    expect(ids.has("stranger")).toBe(true);
  });

  it("never leaks a household player explicitly assigned to a different organization", async () => {
    const body = await getUsersAsAdmin();
    const ids = new Set(body.map((u) => u.id));
    expect(ids.has("foreign-player")).toBe(false);
  });

  it("enriches player rows with the team/status fields the admin Users tab expects", async () => {
    const body = await getUsersAsAdmin();
    const sam = body.find((u) => u.id === "player-sam");
    expect(sam).toBeDefined();
    expect(sam!.activeTeams).toEqual([]);
    expect(sam!.teamIds).toEqual([]);
    expect(sam!.statusTag).toBe("none");
    // Invite token must never be sent down to the client; instead a derived
    // boolean is exposed. UsersListEntry omits inviteToken at the type level,
    // so we double-check at runtime via property lookup on the JSON shape.
    expect("inviteToken" in (sam as object)).toBe(false);
    expect(sam!.hasPendingInvite).toBe(false);
  });
});
