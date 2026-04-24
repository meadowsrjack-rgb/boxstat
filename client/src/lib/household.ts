/**
 * Minimal user shape required by the household grouping helpers. Generic
 * callers (like the admin Users tab) pass their own richer record types
 * via the generic parameter, so the helpers preserve those types end-to-end
 * without resorting to `any` index signatures.
 */
export interface HouseholdUser {
  id: string;
  role?: string | null;
  email?: string | null;
  accountHolderId?: string | null;
  parentId?: string | null;
}

export type DisplayEmailResolver<T extends HouseholdUser> = (user: T) => string;

/**
 * Default display-email resolver that mirrors how the admin Users tab finds an
 * email for a player profile (fall back to the linked account holder's email).
 */
export function makeDisplayEmailResolver<T extends HouseholdUser>(
  users: T[],
): DisplayEmailResolver<T> {
  const byId = new Map<string, T>(users.map((u) => [u.id, u]));
  return (user: T) => {
    if (user.email) return user.email;
    if (user.role === "player") {
      const holderId = user.accountHolderId || user.parentId;
      if (holderId) {
        const holder = byId.get(holderId);
        if (holder?.email) return holder.email;
      }
    }
    return "";
  };
}

/**
 * Walk up the `accountHolderId` / `parentId` chain to the root account holder
 * for the household. Returns a stable key like `root:<id>` (or a fallback
 * keyed off the resolved display email or the user's own id).
 *
 * Task #308: Players whose `accountHolderId` points at a sibling profile
 * (e.g. an admin/coach role of the same human) must still group under the
 * canonical parent row, not float off into their own family.
 */
export function resolveRootKey<T extends HouseholdUser>(
  user: T,
  userById: Map<string, T>,
  getDisplayEmail: DisplayEmailResolver<T>,
): string {
  const visited = new Set<string>();
  let cur: T | undefined = user;
  while (cur && !visited.has(cur.id)) {
    visited.add(cur.id);
    const holderId = cur.accountHolderId || cur.parentId;
    if (!holderId || holderId === cur.id) break;
    const next = userById.get(holderId);
    if (!next) break;
    cur = next;
  }
  if (cur?.id) return `root:${cur.id}`;
  const email = (getDisplayEmail(user) || "").toLowerCase();
  if (email) return `email:${email}`;
  return `self:${user.id}`;
}

export interface HouseholdGroupingContext<T extends HouseholdUser> {
  userById: Map<string, T>;
  getDisplayEmail: DisplayEmailResolver<T>;
  householdMembersByRoot: Map<string, T[]>;
}

/**
 * Build the household grouping index used by the admin Users tab. Returns a
 * shared context object that can be reused across `householdPlayersFor` and
 * `groupUsersByHousehold` so the chain walk happens once.
 */
export function buildHouseholdContext<T extends HouseholdUser>(
  users: T[],
  getDisplayEmail?: DisplayEmailResolver<T>,
): HouseholdGroupingContext<T> {
  const userById = new Map<string, T>(users.map((u) => [u.id, u]));
  const resolver = getDisplayEmail || makeDisplayEmailResolver(users);
  const householdMembersByRoot = new Map<string, T[]>();
  for (const u of users) {
    const key = resolveRootKey(u, userById, resolver);
    if (!householdMembersByRoot.has(key)) householdMembersByRoot.set(key, []);
    householdMembersByRoot.get(key)!.push(u);
  }
  return { userById, getDisplayEmail: resolver, householdMembersByRoot };
}

/**
 * Returns every player profile (excluding the user themselves) that shares a
 * household with the given user.
 */
export function householdPlayersFor<T extends HouseholdUser>(
  user: T,
  ctx: HouseholdGroupingContext<T>,
): T[] {
  const key = resolveRootKey(user, ctx.userById, ctx.getDisplayEmail);
  const members = ctx.householdMembersByRoot.get(key) || [];
  return members.filter((m) => m.id !== user.id && m.role === "player");
}

/**
 * Re-orders a sorted user list so that every household renders contiguously.
 * The first time a family key is seen in the input order determines that
 * family's position, so "newest at top" still holds but the whole household
 * rides along with the parent row.
 */
export function groupUsersByHousehold<T extends HouseholdUser>(
  sortedUsers: T[],
  ctx: HouseholdGroupingContext<T>,
): T[] {
  const familyOrder: string[] = [];
  const familyBuckets = new Map<string, T[]>();
  for (const u of sortedUsers) {
    const key = resolveRootKey(u, ctx.userById, ctx.getDisplayEmail);
    if (!familyBuckets.has(key)) {
      familyBuckets.set(key, []);
      familyOrder.push(key);
    }
    familyBuckets.get(key)!.push(u);
  }
  const out: T[] = [];
  for (const key of familyOrder) {
    out.push(...(familyBuckets.get(key) || []));
  }
  return out;
}
