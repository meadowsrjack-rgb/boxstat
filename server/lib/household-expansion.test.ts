import { describe, it, expect, vi } from "vitest";
import { expandHouseholdMembers, type HouseholdMember } from "./household-expansion";

/**
 * Task #310 regression coverage for the bug fixed in Task #308: the admin
 * `/api/users` endpoint must surface every household player, including the
 * tricky cases where a player's `accountHolderId` points at a sibling
 * profile (e.g. an admin/coach role of the same human) and where a child
 * player's `organizationId` is null.
 *
 * The expansion helper here is the same code path used by `/api/users`, so
 * exercising it with a fake fetcher that mimics the org-scoped DB query is
 * a faithful regression test without needing to spin up the full server.
 */
function makeOrgFetcher(allUsers: HouseholdMember[], organizationId: string) {
  // Mimics the production query: rows linked to the frontier through
  // accountHolderId or parentId, restricted to the same org or org-null.
  return vi.fn(async (frontierIds: string[]) => {
    const set = new Set(frontierIds);
    return allUsers.filter((u) => {
      const linksToFrontier =
        (u.accountHolderId && set.has(u.accountHolderId)) ||
        (u.parentId && set.has(u.parentId));
      if (!linksToFrontier) return false;
      return u.organizationId === organizationId || u.organizationId == null;
    });
  });
}

describe("expandHouseholdMembers (Task #308 regression)", () => {
  const ORG = "org-1";
  const OTHER_ORG = "org-2";

  // Household layout for the parent "Alex":
  //   parent-alex          — parent role, in ORG (canonical root)
  //   admin-alex           — same human, admin role, in ORG, accountHolderId=parent-alex
  //   coach-alex           — same human, coach role, in ORG, accountHolderId=parent-alex
  //   player-sam           — child whose accountHolderId points at the admin
  //                          sibling profile (the bug case), organizationId=ORG
  //   player-jordan        — child with organizationId=null (the other bug
  //                          case), accountHolderId=parent-alex
  //   player-riley         — child reached via parent-alex through parentId
  //                          instead of accountHolderId, organizationId=null
  //   stranger             — unrelated user in ORG; should be untouched
  //   foreign-player       — child of parent-alex but explicitly assigned to
  //                          a DIFFERENT org; must NOT leak in
  const allUsers: HouseholdMember[] = [
    { id: "parent-alex", role: "parent", organizationId: ORG, accountHolderId: null, parentId: null },
    { id: "admin-alex", role: "admin", organizationId: ORG, accountHolderId: "parent-alex", parentId: null },
    { id: "coach-alex", role: "coach", organizationId: ORG, accountHolderId: "parent-alex", parentId: null },
    { id: "player-sam", role: "player", organizationId: ORG, accountHolderId: "admin-alex", parentId: null },
    { id: "player-jordan", role: "player", organizationId: null, accountHolderId: "parent-alex", parentId: null },
    { id: "player-riley", role: "player", organizationId: null, accountHolderId: null, parentId: "parent-alex" },
    { id: "stranger", role: "parent", organizationId: ORG, accountHolderId: null, parentId: null },
    { id: "foreign-player", role: "player", organizationId: OTHER_ORG, accountHolderId: "parent-alex", parentId: null },
  ];

  // The route's `getUsersByOrganization` returns users explicitly tagged
  // with this org. Notably, that excludes `player-jordan` and `player-riley`
  // (org=null) and `player-sam` only shows up because it has org=ORG, but the
  // bug was that the family-grouping ignored it because its accountHolder
  // was a sibling — admin-dashboard tests below cover that side.
  const orgUsers = allUsers.filter((u) => u.organizationId === ORG);

  it("includes household players linked through a sibling admin/coach profile", async () => {
    const fetcher = makeOrgFetcher(allUsers, ORG);
    const expanded = await expandHouseholdMembers(orgUsers, fetcher);
    const ids = new Set(expanded.map((u) => u.id));
    expect(ids.has("player-sam")).toBe(true);
  });

  it("includes household players whose organizationId is null", async () => {
    const fetcher = makeOrgFetcher(allUsers, ORG);
    const expanded = await expandHouseholdMembers(orgUsers, fetcher);
    const ids = new Set(expanded.map((u) => u.id));
    expect(ids.has("player-jordan")).toBe(true);
    expect(ids.has("player-riley")).toBe(true);
  });

  it("returns every household player that the admin Users tab should see", async () => {
    const fetcher = makeOrgFetcher(allUsers, ORG);
    const expanded = await expandHouseholdMembers(orgUsers, fetcher);
    const playerIds = expanded.filter((u) => u.role === "player").map((u) => u.id).sort();
    expect(playerIds).toEqual(["player-jordan", "player-riley", "player-sam"]);
  });

  it("never pulls in users that belong to a different organization", async () => {
    const fetcher = makeOrgFetcher(allUsers, ORG);
    const expanded = await expandHouseholdMembers(orgUsers, fetcher);
    const ids = new Set(expanded.map((u) => u.id));
    expect(ids.has("foreign-player")).toBe(false);
  });

  it("does not duplicate members already in the org seed list", async () => {
    const fetcher = makeOrgFetcher(allUsers, ORG);
    const expanded = await expandHouseholdMembers(orgUsers, fetcher);
    const ids = expanded.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("stops querying once no new members are discovered", async () => {
    const fetcher = makeOrgFetcher(allUsers, ORG);
    await expandHouseholdMembers(orgUsers, fetcher);
    // First call seeds, second call returns no new ids → loop exits.
    // Exact call count is implementation detail, but it must not run all 5
    // hops when the household is fully resolved after one expansion.
    expect(fetcher.mock.calls.length).toBeLessThanOrEqual(3);
  });
});
