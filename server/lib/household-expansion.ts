/**
 * Minimal shape required by the household expansion BFS. Generic callers can
 * pass any record that satisfies this — `expandHouseholdMembers` preserves
 * the full caller type via the generic parameter.
 */
export interface HouseholdMember {
  id: string;
  accountHolderId?: string | null;
  parentId?: string | null;
  organizationId?: string | null;
}

export type HouseholdExtrasFetcher<T extends HouseholdMember> = (
  frontierIds: string[],
) => Promise<T[]>;

/**
 * Task #308: BFS-expand the admin Users list so household members whose
 * `accountHolderId` points at a sibling profile (e.g. an admin/coach role
 * of the same human) or whose `organizationId` is null still surface in
 * the admin Users tab. We start from the in-org users, then iteratively
 * pull in any users that link to the current frontier through
 * `accountHolderId` or `parentId`. The fetcher is responsible for the
 * org-boundary check (only org-matching or null-org rows).
 *
 * Extracted from `/api/users` so the expansion logic is unit-testable
 * without standing up the full route.
 */
export async function expandHouseholdMembers<T extends HouseholdMember>(
  orgUsers: T[],
  fetchExtras: HouseholdExtrasFetcher<T>,
  maxHops = 5,
): Promise<T[]> {
  const householdById = new Map<string, T>(orgUsers.map((u) => [u.id, u]));
  let frontier = new Set<string>(orgUsers.map((u) => u.id));
  for (let hop = 0; hop < maxHops && frontier.size > 0; hop++) {
    const frontierIds = Array.from(frontier);
    const extras = await fetchExtras(frontierIds);
    const next = new Set<string>();
    for (const row of extras) {
      if (householdById.has(row.id)) continue;
      householdById.set(row.id, row);
      next.add(row.id);
    }
    frontier = next;
  }
  return Array.from(householdById.values());
}
