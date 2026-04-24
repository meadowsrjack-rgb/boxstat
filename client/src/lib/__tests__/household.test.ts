import { describe, it, expect } from "vitest";
import {
  buildHouseholdContext,
  groupUsersByHousehold,
  householdPlayersFor,
  resolveRootKey,
  makeDisplayEmailResolver,
  type HouseholdUser,
} from "../household";

/**
 * Task #310 regression coverage for the admin dashboard's family-grouping
 * logic from Task #308. The bug was that players linked to a sibling
 * profile (e.g. an admin/coach role of the same human) or with a null
 * `organizationId` were grouped into their own family rows instead of
 * appearing under the canonical parent row.
 */

// Household for the parent "Alex":
//   parent-alex            — canonical parent root row
//   admin-alex             — same human, admin role, accountHolderId=parent
//   coach-alex             — same human, coach role, accountHolderId=parent
//   player-sam             — child whose accountHolderId points at the
//                            sibling admin profile (the bug case)
//   player-jordan          — child with organizationId=null (other bug case)
//   player-riley           — child reached via parent-alex through parentId
// Plus an unrelated household:
//   parent-bri             — separate parent
//   player-kai             — bri's child
const HOUSEHOLD: HouseholdUser[] = [
  { id: "parent-alex", role: "parent", email: "alex@example.com", accountHolderId: null, parentId: null },
  { id: "admin-alex", role: "admin", email: "alex@example.com", accountHolderId: "parent-alex", parentId: null },
  { id: "coach-alex", role: "coach", email: "alex@example.com", accountHolderId: "parent-alex", parentId: null },
  { id: "player-sam", role: "player", email: null, accountHolderId: "admin-alex", parentId: null },
  { id: "player-jordan", role: "player", email: null, accountHolderId: "parent-alex", parentId: null, organizationId: null },
  { id: "player-riley", role: "player", email: null, accountHolderId: null, parentId: "parent-alex", organizationId: null },
  { id: "parent-bri", role: "parent", email: "bri@example.com", accountHolderId: null, parentId: null },
  { id: "player-kai", role: "player", email: null, accountHolderId: "parent-bri", parentId: null },
];

describe("household grouping (Task #308 regression)", () => {
  it("resolves a player linked through a sibling profile back to the canonical parent root", () => {
    const ctx = buildHouseholdContext(HOUSEHOLD);
    const sam = HOUSEHOLD.find((u) => u.id === "player-sam")!;
    expect(resolveRootKey(sam, ctx.userById, ctx.getDisplayEmail)).toBe("root:parent-alex");
  });

  it("resolves a player with null organizationId to the canonical parent root", () => {
    const ctx = buildHouseholdContext(HOUSEHOLD);
    const jordan = HOUSEHOLD.find((u) => u.id === "player-jordan")!;
    const riley = HOUSEHOLD.find((u) => u.id === "player-riley")!;
    expect(resolveRootKey(jordan, ctx.userById, ctx.getDisplayEmail)).toBe("root:parent-alex");
    expect(resolveRootKey(riley, ctx.userById, ctx.getDisplayEmail)).toBe("root:parent-alex");
  });

  it("lists every household player in the parent row's nested linked-players list", () => {
    const ctx = buildHouseholdContext(HOUSEHOLD);
    const parent = HOUSEHOLD.find((u) => u.id === "parent-alex")!;
    const linked = householdPlayersFor(parent, ctx).map((p) => p.id).sort();
    expect(linked).toEqual(["player-jordan", "player-riley", "player-sam"]);
  });

  it("exposes the same household players from the sibling admin/coach rows", () => {
    const ctx = buildHouseholdContext(HOUSEHOLD);
    const admin = HOUSEHOLD.find((u) => u.id === "admin-alex")!;
    const coach = HOUSEHOLD.find((u) => u.id === "coach-alex")!;
    const adminLinked = householdPlayersFor(admin, ctx).map((p) => p.id).sort();
    const coachLinked = householdPlayersFor(coach, ctx).map((p) => p.id).sort();
    expect(adminLinked).toEqual(["player-jordan", "player-riley", "player-sam"]);
    expect(coachLinked).toEqual(["player-jordan", "player-riley", "player-sam"]);
  });

  it("groups every household member under the same family in the Users list", () => {
    const ctx = buildHouseholdContext(HOUSEHOLD);
    // Simulate a sorted-by-newest Users list where the family is interleaved
    // with an unrelated household — the regression was that the siblings/
    // null-org players would float off into their own rows.
    const sorted: HouseholdUser[] = [
      HOUSEHOLD.find((u) => u.id === "player-sam")!,
      HOUSEHOLD.find((u) => u.id === "parent-bri")!,
      HOUSEHOLD.find((u) => u.id === "player-jordan")!,
      HOUSEHOLD.find((u) => u.id === "parent-alex")!,
      HOUSEHOLD.find((u) => u.id === "admin-alex")!,
      HOUSEHOLD.find((u) => u.id === "player-riley")!,
      HOUSEHOLD.find((u) => u.id === "coach-alex")!,
      HOUSEHOLD.find((u) => u.id === "player-kai")!,
    ];
    const grouped = groupUsersByHousehold(sorted, ctx).map((u) => u.id);

    // Alex's whole household must render contiguously, then Bri's.
    const alexFamily = ["player-sam", "parent-alex", "admin-alex", "coach-alex", "player-jordan", "player-riley"];
    const briFamily = ["parent-bri", "player-kai"];
    const alexIndices = alexFamily.map((id) => grouped.indexOf(id));
    const briIndices = briFamily.map((id) => grouped.indexOf(id));
    const alexMin = Math.min(...alexIndices);
    const alexMax = Math.max(...alexIndices);
    const briMin = Math.min(...briIndices);
    const briMax = Math.max(...briIndices);
    // No bri member sneaks into the alex range.
    expect(briMin > alexMax || briMax < alexMin).toBe(true);
    // alex range is contiguous.
    expect(alexMax - alexMin + 1).toBe(alexFamily.length);
  });

  it("falls back to the linked account holder's email for player display", () => {
    const resolver = makeDisplayEmailResolver(HOUSEHOLD);
    const sam = HOUSEHOLD.find((u) => u.id === "player-sam")!;
    expect(resolver(sam)).toBe("alex@example.com");
  });
});
