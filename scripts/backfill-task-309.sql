-- Task #309 one-off backfill: clean up household links so child player
-- profiles point at the canonical parent role profile of their household
-- and inherit the household's organization.
--
-- Background: Task #308 added a read-time chain walk in /api/users and
-- /api/account/players to recover households where a player's
-- `account_holder_id` pointed at a sibling admin/coach profile of the
-- same human, or where `organization_id` was NULL. That workaround keeps
-- the UI consistent but leaves the underlying rows inconsistent. This
-- backfill rewrites the bad links once so the chain walk can eventually
-- be retired.
--
-- The script is idempotent and self-checking: every UPDATE filters on
-- the broken state, the parent-profile INSERT skips households that
-- already have one, and the final invariant block raises if any
-- residual inconsistency remains so the transaction rolls back.
--
-- Preflight before running on a new environment:
--   -- Active users with no resolvable household root + no org. These
--   -- will hit the orphan-deactivation step (3); confirm they are
--   -- expected casualties before running.
--   SELECT id, email, role
--     FROM users u
--    WHERE u.is_active = true
--      AND u.organization_id IS NULL
--      AND u.account_holder_id IS NULL
--      AND u.parent_id IS NOT NULL
--      AND NOT EXISTS (SELECT 1 FROM users x WHERE x.id = u.parent_id);
--
--   -- Active users with a NULL organization_id whose household root
--   -- also has a NULL org. The script cannot heal these; clean them up
--   -- (set is_active=false or assign an organization) before running,
--   -- otherwise invariant A will fire and the whole transaction rolls
--   -- back without committing any of the safe fixes.
--   SELECT id, email, role
--     FROM users WHERE is_active = true AND organization_id IS NULL;
--
-- High-level steps:
--   0. For households whose root is admin/coach with active player
--      descendants but no `parent` role sibling, mint a canonical
--      `parent` role profile mirroring the root.
--   1. Re-link every player's `account_holder_id`/`parent_id` to the
--      canonical parent role profile of its household.
--   2. Backfill `organization_id` for active household members from the
--      household root.
--   3. Deactivate truly orphaned active users whose `parent_id` targets
--      a user that no longer exists and that have no other recoverable
--      household link.
--   4. Assert the desired invariants. The transaction rolls back if any
--      check fails.

BEGIN;

-- Reusable household-root walker. Bounded to 10 hops with a self-loop
-- guard. Walks `account_holder_id` first, falling back to `parent_id`
-- when the chain bottoms out, so legacy rows that only set `parent_id`
-- are still resolved.
--
-- Postgres doesn't support a CREATE TEMP RECURSIVE VIEW, so the same
-- recursive CTE is repeated in each step below.

-- ---------------------------------------------------------------
-- Step 0: Mint missing canonical parent role profiles.
-- ---------------------------------------------------------------
WITH RECURSIVE chain AS (
  SELECT id AS user_id, id AS current_id, 0 AS depth
  FROM users
  UNION ALL
  SELECT
    c.user_id,
    COALESCE(u.account_holder_id, u.parent_id) AS current_id,
    c.depth + 1
  FROM chain c
  JOIN users u ON u.id = c.current_id
  WHERE COALESCE(u.account_holder_id, u.parent_id) IS NOT NULL
    AND COALESCE(u.account_holder_id, u.parent_id) <> c.current_id
    AND c.depth < 10
),
roots AS (
  SELECT DISTINCT ON (user_id) user_id, current_id AS root_id
  FROM chain
  ORDER BY user_id, depth DESC
),
households_needing_parent AS (
  -- Households whose root is admin/coach, has at least one active player
  -- descendant, knows its organization, and has no `parent` role sibling
  -- yet. We only mint when there are active players to satisfy the
  -- "child profiles point at a parent role profile" invariant for them.
  SELECT
    root.id            AS root_id,
    root.first_name,
    root.last_name,
    root.email,
    root.organization_id
  FROM roots r
  JOIN users root   ON root.id = r.root_id
  JOIN users player ON player.id = r.user_id
                   AND player.role = 'player'
                   AND player.is_active = true
  WHERE root.organization_id IS NOT NULL
    AND root.role IN ('admin', 'coach')
    AND NOT EXISTS (
      SELECT 1 FROM users sib
      WHERE (sib.id = root.id OR sib.account_holder_id = root.id)
        AND sib.role = 'parent'
    )
  GROUP BY root.id, root.first_name, root.last_name, root.email, root.organization_id
)
INSERT INTO users (
  id,
  first_name,
  last_name,
  email,
  role,
  organization_id,
  account_holder_id,
  parent_id,
  is_active,
  has_registered,
  verified,
  user_type,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid()::text,
  first_name,
  last_name,
  email,
  'parent',
  organization_id,
  root_id,
  root_id,
  true,
  true,
  true,
  'parent',
  NOW(),
  NOW()
FROM households_needing_parent;

-- ---------------------------------------------------------------
-- Step 1: Re-link players to the canonical parent role profile in
-- their household.
-- ---------------------------------------------------------------
WITH RECURSIVE chain AS (
  SELECT id AS user_id, id AS current_id, 0 AS depth
  FROM users
  UNION ALL
  SELECT
    c.user_id,
    COALESCE(u.account_holder_id, u.parent_id) AS current_id,
    c.depth + 1
  FROM chain c
  JOIN users u ON u.id = c.current_id
  WHERE COALESCE(u.account_holder_id, u.parent_id) IS NOT NULL
    AND COALESCE(u.account_holder_id, u.parent_id) <> c.current_id
    AND c.depth < 10
),
roots AS (
  SELECT DISTINCT ON (user_id) user_id, current_id AS root_id
  FROM chain
  ORDER BY user_id, depth DESC
),
canonical_parent AS (
  -- One canonical parent per household: prefer the root itself if it
  -- already has role='parent', otherwise the oldest active parent
  -- sibling, falling back to an inactive parent sibling.
  SELECT DISTINCT ON (r.root_id)
    r.root_id,
    cp.id AS canonical_parent_id
  FROM (SELECT DISTINCT root_id FROM roots) r
  LEFT JOIN users cp
    ON (cp.id = r.root_id OR cp.account_holder_id = r.root_id)
   AND cp.role = 'parent'
  ORDER BY r.root_id,
           (cp.id = r.root_id) DESC,
           cp.is_active DESC NULLS LAST,
           cp.created_at ASC
)
UPDATE users p
SET account_holder_id = cp.canonical_parent_id,
    parent_id = cp.canonical_parent_id
FROM roots r
JOIN canonical_parent cp ON cp.root_id = r.root_id
WHERE p.id = r.user_id
  AND p.role = 'player'
  AND cp.canonical_parent_id IS NOT NULL
  AND cp.canonical_parent_id <> p.id
  AND (
    p.account_holder_id IS DISTINCT FROM cp.canonical_parent_id
    OR p.parent_id      IS DISTINCT FROM cp.canonical_parent_id
  );

-- ---------------------------------------------------------------
-- Step 2: Backfill organization_id for any active household member
-- whose org disagrees with the household root's org. This covers both
-- NULL orgs and stale non-NULL orgs that drifted from the root.
-- ---------------------------------------------------------------
WITH RECURSIVE chain AS (
  SELECT id AS user_id, id AS current_id, 0 AS depth
  FROM users
  UNION ALL
  SELECT
    c.user_id,
    COALESCE(u.account_holder_id, u.parent_id) AS current_id,
    c.depth + 1
  FROM chain c
  JOIN users u ON u.id = c.current_id
  WHERE COALESCE(u.account_holder_id, u.parent_id) IS NOT NULL
    AND COALESCE(u.account_holder_id, u.parent_id) <> c.current_id
    AND c.depth < 10
),
roots AS (
  SELECT DISTINCT ON (user_id) user_id, current_id AS root_id
  FROM chain
  ORDER BY user_id, depth DESC
)
UPDATE users u
SET organization_id = root.organization_id
FROM roots r
JOIN users root ON root.id = r.root_id
WHERE u.id = r.user_id
  AND u.id <> root.id
  AND u.is_active = true
  AND root.organization_id IS NOT NULL
  AND u.organization_id IS DISTINCT FROM root.organization_id;

-- ---------------------------------------------------------------
-- Step 3: Deactivate truly orphaned active users whose `parent_id`
-- targets a user that no longer exists and have no other recoverable
-- household link or organization. Generic — not tied to a hardcoded id.
-- ---------------------------------------------------------------
UPDATE users u
SET is_active = false
WHERE u.is_active = true
  AND u.organization_id IS NULL
  AND u.account_holder_id IS NULL
  AND u.parent_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM users x WHERE x.id = u.parent_id);

-- ---------------------------------------------------------------
-- Step 4: Invariant assertions. RAISE EXCEPTION rolls the whole
-- transaction back if anything is still broken.
-- ---------------------------------------------------------------
DO $invariants$
DECLARE
  bad_count integer;
BEGIN
  -- Invariant A: no active user has a NULL organization_id.
  SELECT COUNT(*) INTO bad_count
  FROM users
  WHERE is_active = true AND organization_id IS NULL;

  IF bad_count > 0 THEN
    RAISE EXCEPTION
      'Task #309 invariant A failed: % active users still have NULL organization_id',
      bad_count;
  END IF;

  -- Invariant B: every active player's account_holder_id and parent_id
  -- point at a `parent` role profile in the same organization.
  SELECT COUNT(*) INTO bad_count
  FROM users p
  LEFT JOIN users ah ON ah.id = p.account_holder_id
  LEFT JOIN users par ON par.id = p.parent_id
  WHERE p.role = 'player'
    AND p.is_active = true
    AND (
      ah.id IS NULL
      OR par.id IS NULL
      OR ah.role <> 'parent'
      OR par.role <> 'parent'
      OR ah.organization_id IS DISTINCT FROM p.organization_id
      OR par.organization_id IS DISTINCT FROM p.organization_id
    );

  IF bad_count > 0 THEN
    RAISE EXCEPTION
      'Task #309 invariant B failed: % active players still link to non-parent or cross-org account holders',
      bad_count;
  END IF;

  -- Invariant C: every household member's organization_id matches the
  -- household root's organization_id (no cross-org leakage).
  SELECT COUNT(*) INTO bad_count
  FROM (
    WITH RECURSIVE chain AS (
      SELECT id AS user_id, id AS current_id, 0 AS depth
      FROM users
      UNION ALL
      SELECT
        c.user_id,
        COALESCE(u.account_holder_id, u.parent_id) AS current_id,
        c.depth + 1
      FROM chain c
      JOIN users u ON u.id = c.current_id
      WHERE COALESCE(u.account_holder_id, u.parent_id) IS NOT NULL
        AND COALESCE(u.account_holder_id, u.parent_id) <> c.current_id
        AND c.depth < 10
    ),
    roots AS (
      SELECT DISTINCT ON (user_id) user_id, current_id AS root_id
      FROM chain
      ORDER BY user_id, depth DESC
    )
    SELECT u.id
    FROM users u
    JOIN roots r ON r.user_id = u.id
    JOIN users root ON root.id = r.root_id
    WHERE u.is_active = true
      AND root.organization_id IS NOT NULL
      AND u.organization_id IS DISTINCT FROM root.organization_id
  ) mismatched;

  IF bad_count > 0 THEN
    RAISE EXCEPTION
      'Task #309 invariant C failed: % active household members have organization_id mismatched against their household root',
      bad_count;
  END IF;
END
$invariants$;

COMMIT;

-- Verification queries (read-only, safe to run after commit):
--   -- Logan should now point at the canonical parent profile, not the
--   -- admin sibling.
--   SELECT id, account_holder_id, parent_id
--     FROM users WHERE id = '1765339905344-g4wpmf633';
--
--   -- No active user should have a NULL organization_id.
--   SELECT COUNT(*) FROM users
--    WHERE is_active = true AND organization_id IS NULL;
--     -> 0
--
--   -- No active player should still point at an admin/coach sibling.
--   SELECT p.id, p.first_name, ah.role AS ah_role, par.role AS par_role
--     FROM users p
--     LEFT JOIN users ah  ON ah.id  = p.account_holder_id
--     LEFT JOIN users par ON par.id = p.parent_id
--    WHERE p.role = 'player' AND p.is_active = true
--      AND (ah.role <> 'parent' OR par.role <> 'parent');
--     -> 0 rows
