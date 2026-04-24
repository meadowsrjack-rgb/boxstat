import type { Express, RequestHandler } from "express";
import type { SelectUser } from "@shared/schema";
import { expandHouseholdMembers } from "./household-expansion";

export interface ActiveTeamMembership {
  profileId: string;
  teamId: number;
  status: string;
}

export interface PlayerStatusTag {
  tag: string;
  remainingCredits?: number | null;
  lowBalance?: boolean;
}

export interface UsersListTeam {
  id: number;
  name: string;
  programId?: number | null;
}

export interface UsersListProgram {
  id: number;
  name: string;
}

export interface UsersListStorage {
  getUsersByOrganization(orgId: string): Promise<SelectUser[]>;
  getTeamsByOrganization(orgId: string): Promise<UsersListTeam[]>;
  getProgramsByOrganization(orgId: string): Promise<UsersListProgram[]>;
  getPlayerStatusTagsBulk(playerIds: string[]): Promise<Map<string, PlayerStatusTag>>;
}

export interface UsersListDeps {
  storage: UsersListStorage;
  // Org-scoped: pulls users linked to the frontier through accountHolderId or
  // parentId, restricted to the same organization or org-null.
  fetchHouseholdExtras: (organizationId: string, frontierIds: string[]) => Promise<SelectUser[]>;
  fetchActiveTeamMemberships: () => Promise<ActiveTeamMembership[]>;
}

export interface UsersListActiveTeamEntry {
  teamId: number;
  teamName: string;
  programId: number | null | undefined;
  programName: string | null;
  isTryout: boolean;
}

export type UsersListEntry = Omit<SelectUser, "inviteToken"> & {
  hasPendingInvite: boolean;
  statusTag: string | null;
  remainingCredits?: number | null;
  lowBalance?: boolean;
  teamIds: number[];
  activeTeams: UsersListActiveTeamEntry[];
  isTryout?: boolean;
};

function stripInviteToken(u: SelectUser): Omit<SelectUser, "inviteToken"> & { hasPendingInvite: boolean } {
  const hasPendingInvite = u.status === "invited" && !!u.inviteToken;
  const { inviteToken: _inviteToken, ...rest } = u;
  return { ...rest, hasPendingInvite };
}

/**
 * Builds the JSON payload returned by GET /api/users for the admin Users
 * tab. Extracted from `server/routes.ts` so the route's contract — most
 * importantly the Task #308 household expansion — can be exercised by an
 * endpoint-level regression test without spinning up the entire server.
 */
export async function buildUsersListResponse(
  organizationId: string,
  deps: UsersListDeps,
): Promise<UsersListEntry[]> {
  const { storage, fetchHouseholdExtras, fetchActiveTeamMemberships } = deps;

  const orgUsers = await storage.getUsersByOrganization(organizationId);
  const allTeams = await storage.getTeamsByOrganization(organizationId);
  const allPrograms = await storage.getProgramsByOrganization(organizationId);

  const allUsers = await expandHouseholdMembers<SelectUser>(
    orgUsers,
    (frontierIds) => fetchHouseholdExtras(organizationId, frontierIds),
  );

  const teamMap = new Map<number, UsersListTeam>(allTeams.map((t) => [t.id, t]));
  const programMap = new Map<number, UsersListProgram>(allPrograms.map((p) => [p.id, p]));

  const activeMemberships = await fetchActiveTeamMemberships();

  const membershipsByUser = new Map<string, number[]>();
  const tryoutMembershipSet = new Set<string>();
  for (const m of activeMemberships) {
    const existing = membershipsByUser.get(m.profileId) || [];
    existing.push(m.teamId);
    membershipsByUser.set(m.profileId, existing);
    if (m.status === "tryout") {
      tryoutMembershipSet.add(`${m.profileId}-${m.teamId}`);
    }
  }

  const players = allUsers.filter((u) => u.role === "player");
  const nonPlayers = allUsers.filter((u) => u.role !== "player");

  const playerIds = players.map((p) => p.id);
  let statusTagsMap = new Map<string, PlayerStatusTag>();
  try {
    statusTagsMap = await storage.getPlayerStatusTagsBulk(playerIds);
  } catch (error) {
    console.error("Error fetching bulk status tags:", error);
  }

  const enrichedPlayers: UsersListEntry[] = players.map((player) => {
    const statusTag = statusTagsMap.get(player.id) || {
      tag: player.paymentStatus === "pending" ? "payment_due" : "none",
    };
    const activeTeamIds = membershipsByUser.get(player.id) || [];
    const activeTeams: UsersListActiveTeamEntry[] = activeTeamIds
      .map((teamId): UsersListActiveTeamEntry | null => {
        const team = teamMap.get(teamId);
        if (!team) return null;
        const program = team.programId ? programMap.get(team.programId) : null;
        return {
          teamId: team.id,
          teamName: team.name,
          programId: team.programId,
          programName: program?.name ?? null,
          isTryout: tryoutMembershipSet.has(`${player.id}-${teamId}`),
        };
      })
      .filter((t): t is UsersListActiveTeamEntry => t !== null);

    const hasTryoutMembership = activeTeams.some((t) => t.isTryout);

    return {
      ...stripInviteToken(player),
      statusTag: statusTag.tag || "none",
      remainingCredits: statusTag.remainingCredits,
      lowBalance: statusTag.lowBalance,
      teamIds: activeTeamIds,
      activeTeams,
      isTryout: hasTryoutMembership,
    };
  });

  const enrichedNonPlayers: UsersListEntry[] = nonPlayers.map((user) => ({
    ...stripInviteToken(user),
    statusTag: null,
    teamIds: [],
    activeTeams: [],
  }));

  return [...enrichedNonPlayers, ...enrichedPlayers];
}

export interface RegisterUsersListRouteOptions {
  authMiddleware: RequestHandler;
  deps: UsersListDeps;
}

/**
 * Registers GET /api/users on the supplied Express app. The route logic
 * lives in `buildUsersListResponse`; this wrapper keeps auth and the deps
 * injectable so production wires in real auth + db deps and tests can
 * pass in a stub auth middleware and mock deps.
 */
export function registerUsersListRoute(app: Express, options: RegisterUsersListRouteOptions): void {
  const { authMiddleware, deps } = options;
  app.get("/api/users", authMiddleware, async (req, res) => {
    try {
      const organizationId = (req as { user?: { organizationId?: string } }).user?.organizationId;
      if (!organizationId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }
      const payload = await buildUsersListResponse(organizationId, deps);
      res.json(payload);
    } catch (err) {
      console.error("[GET /api/users] failed:", err);
      res.status(500).json({ error: "Failed to load users" });
    }
  });
}
