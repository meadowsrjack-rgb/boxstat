# User State Model Redesign

> Status: **Design doc, not yet implemented.** No code, schema, or migrations
> change as a result of approving this document. Every implementation task
> below will be opened separately, sized into independently shippable phases.
>
> Audience: the schema/migration chapters are written for an engineer; the
> "What changes for users" chapter and the edge-case walkthroughs are written
> so a non-technical reader can follow them.

---

## 1. Why we are doing this

The user/account state in BoxStat has grown organically into a tangle of
overlapping flags spread across `users`, `product_enrollments`,
`team_memberships`, `pending_registrations`, and a handful of derived
helpers. A single player today can simultaneously be:

- `users.isActive = false`
- `users.verified = true`
- `users.hasRegistered = false`
- `users.status = null` (or `'invited'`, or `'active'`)
- `users.paymentStatus = 'pending'`
- `users.approvalStatus = 'pending'`
- `users.teamAssignmentStatus = 'pending'`

…all describing the **same** real-world concept ("waiting for an admin to
approve the parent's join request before this kid can do anything"). Seven
fields. They routinely drift apart. We have **two** nightly backfill scripts
(`backfillStrandedInvites.ts`, `backfillRegisteredInviteFlags.ts`) whose only
job is to repair drift between these fields after the fact.

Why this matters in product terms:

- Coaches see "Invited" badges on parents who registered weeks ago.
- Admins see "Payment Due" tags on kids who already paid because the cache
  was set off the wrong field.
- Banners contradict each other (the dashboard says "Active", the parent
  profile gateway says "Awaiting Approval").
- Every new feature has to re-derive "is this user usable?" from a different
  combination of fields, and gets it wrong in a slightly new way.

The fix is not to keep adding patch flags. The fix is to recognise that
five **independent** product concepts have been collapsed into one "status"
soup, and to give each one its own field with explicit transitions.

This doc is the shared source of truth that every follow-on implementation
task will cite. It does not change behaviour by itself.

---

## 2. The five orthogonal dimensions (plus parent–child)

A real human in BoxStat occupies **five** orthogonal positions. Each
dimension is independent of the others — moving on one axis must never
implicitly move another. The sixth concept (parent–child) is a
relationship between two records, not a state of either.

| # | Dimension | Question it answers | Target representation |
|---|---|---|---|
| A | **Account** | "Does this row represent a real, sign-in-able human?" | `users.account_state` enum |
| B | **Org membership** | "Is this human a known member of this organization?" | `org_memberships` table (one row per (user, org)) |
| C | **Role** | "What kind of work do they do here?" | `user_org_roles` table (one row per role per org) |
| D | **Team assignment** | "Which teams are they on, and in what capacity?" | `team_memberships` (existing, unchanged shape) |
| E | **Payment / access** | "Do they have an active enrollment that unlocks gated features?" | `product_enrollments` (existing) → derived view |
| ↔ | **Parent–child relationship** | "Whose account holds whose data?" | `users.account_holder_id` (renamed unifying single FK) |

Each dimension is described in detail below, including allowed transitions,
the events that drive them, and the explicit independence statement.

### 2.A Account state — `account_state`

**Question:** "Is this a real, sign-in-able person, or a placeholder we
created on someone's behalf?"

**Enum values:**

- `shadow` — created by an admin/migration importer; no one has proven they
  own this email yet. Cannot sign in. Receives invite emails.
- `invited` — a shadow that has been emailed an active invite token; same
  capabilities as `shadow`, distinguished only so we can throttle reminders
  and time out tokens. (Optional — see §10 open question Q1; we may
  collapse this back into `shadow` and treat invite presence as the only
  signal.)
- `verified` — proved email ownership but has not finished setting a
  password / completing required profile fields. Can complete claim.
- `active` — fully claimed account. Can sign in.
- `disabled` — soft-deleted by an admin. Cannot sign in. Data preserved.

**Allowed transitions:**

```
shadow ──invite─sent──> invited ──token─claimed──> active
   │                                  ▲
   └─organic─signup──> verified ──────┘
                          │
                          └─password─set──> active

active ──admin─disable──> disabled ──admin─restore──> active
shadow / invited / verified ──admin─disable──> disabled
```

**Events that drive transitions:**

- `shadow → invited`: admin or migration importer sends invite email.
- `invited → active`: user clicks claim link AND sets a password.
- `organic-signup → verified`: user clicks verify link.
- `verified → active`: user finishes the final registration step (sets
  password if not already).
- `* → disabled`: admin soft-delete.

**Independence statement:** This dimension is **independent of B, C, D, E**.
A `shadow` account can already have a Role and a Team assignment (a coach
imported by an admin). An `active` account can have zero org memberships
(a former coach whose org membership ended). Payment access never moves
this field.

### 2.B Org membership — `org_membership_state`

**Question:** "Is this human a known, accepted member of *this org* — and
if not, what step are they on?"

This is per-(user, org) state. Today it is wedged into `users.approvalStatus`
with single-org assumption baked in via `users.organizationId`,
`requestedOrgId`, and `requestedTeamId`.

**Decision (canonical target):** A dedicated `org_memberships` table
keyed by `(user_id, organization_id)` is the **single** authoritative
home for this dimension. There is **no** `users.org_membership_state`
column and no single-org fallback — every reader queries
`org_memberships`. The existing `users.organizationId` survives only
as a non-authoritative "primary org" hint to drive the default
dashboard load (and is recomputable from `org_memberships` at any
time).

**Enum values (per user, per org):**

- `none` — not a member, no application on file.
- `requested` — submitted a join request (e.g. organic signup picked an
  org/team but admin has not approved yet).
- `member` — accepted; full participation rights subject to E.
- `rejected` — admin denied the join request. Kept on file for audit;
  re-application allowed.
- `removed` — was a member, no longer is. Distinct from `rejected` so the
  UI can differentiate "left/was removed" from "denied at the door".

**Allowed transitions:**

```
none ──user─requests──> requested ──admin─approves──> member ──admin─removes──> removed
                            │                            ▲
                            └─admin─rejects──> rejected──┘ (re-apply later)
```

**Events:**

- `requested`: organic signup submits an org+team selection; profile-gateway
  Add-Player requests approval; migration shadow gets the implicit
  `member` (admin-created → no application needed).
- `member`: admin approves; migration import; admin manual add.
- `rejected`/`removed`: admin actions.

**Independence statement:** Independent of A (a `shadow` account can be a
`member` — the migration case), C (a `member` may have zero or many roles),
D and E.

### 2.C Role — `user_org_roles` table (one row per role per org)

**Question:** "What kind of work does this human do in this org?"

Today: `users.role` (single enum string), `users.userType` (often duplicate
of role), and **also** `teams.coachId` / `headCoachIds[]` /
`assistantCoachIds[]` / `managerIds[]` / `strengthCoachIds[]` (denormalised
team-level role lists, currently the source of staff lists for some
features and team_memberships rows for others — frequently disagreeing).

The single-string `users.role` cannot represent the very common "coach who
is also a parent" case without `linkedAccountId` hacks.

**Target shape:**

```sql
user_org_roles (
  user_id        varchar  references users(id),
  organization_id varchar references organizations(id),
  role           varchar  -- 'admin' | 'coach' | 'parent' | 'player' | 'manager'
  granted_at     timestamp,
  granted_by     varchar  references users(id),
  primary key (user_id, organization_id, role)
)
```

A `users.primary_role` column is kept as a fast denormalised hint for the
default dashboard view, but **all access checks read `user_org_roles`**.

**Allowed transitions:** insert / delete rows. No state machine — a role
either exists or doesn't.

**Independence statement:** Independent of A (you can have roles attached
to a `shadow`), B (a coach with `member`, a player with `requested`).
Replaces the per-team coach arrays in `teams` (those become derived from
`team_memberships` where role is one of the coach roles). Eliminates the
`linkedAccountId` workaround for "coach who is also a parent".

### 2.D Team assignment — `team_memberships`

**Question:** "Which teams is this human on, in what capacity, and at what
status (active / tryout / inactive)?"

This already exists as `team_memberships` and is in roughly the right
shape today. The rescope keeps it largely as-is and **drops the legacy
`users.teamId` / `users.divisionId` columns** plus the per-team coach
arrays on `teams`.

`team_memberships.role` ∈ `'player' | 'coach' | 'assistant_coach' |
'manager' | 'strength_coach'` becomes the single source for "who's on a
team and as what".

`team_memberships.status` ∈ `'active' | 'inactive' | 'pending' | 'tryout'`
becomes the single source for "are they really on it?".

**Independence statement:** Independent of E (paid players can be off a
team; team-assigned players can be unpaid). Strongly recommends but does
not require B = `member`.

### 2.E Payment / access — `product_enrollments` (unchanged)

**Question:** "Do they have an active enrollment that unlocks gated
features, and until when?"

This dimension is **already correctly modelled** in `product_enrollments` +
`shared/access-status.ts` + `shared/access-gate.ts`. The redesign treats
this as the existing-and-correct answer. The only changes are:

1. `users.paymentStatus` becomes a **derived view**, never written
   directly. Computed via `computeAccessStatus(enrollments)`.
2. `users.subscriptionEndDate` is dropped — already derived from the same
   place.
3. The `users.packageSelected` field is dropped — superseded by
   `product_enrollments` rows.

`AccessReason` (`paid | admin_grant | grace | expired | none`) is the
canonical vocabulary.

**Independence statement:** Independent of A (a `shadow` migration import
can carry a paid enrollment), B (a `removed` member can still have a
not-yet-expired paid enrollment until end-date), C, D.

### 2.↔ Parent–child relationship

Today: three overlapping FK columns — `parentId`, `accountHolderId`,
`guardianId`, plus `linkedAccountId` for "same human, different role".

**Target:** **single** column `users.account_holder_id` (FK to
`users.id`). NULL means "this row is its own account holder". Non-NULL
means "this row is a child profile under that account; sign-in is via the
holder". `parentId`, `guardianId` and `linkedAccountId` are dropped after
the deprecation phases.

`linkedAccountId`'s legitimate use case ("same human is both a parent
and a coach") goes away because Role (§2.C) is now multi-valued: one user
row, two `user_org_roles` rows.

---

## 3. Field-by-field mapping (the engineering checklist)

For every state-bearing field on `users` today, this table states which
target dimension absorbs it and what happens to the column. **Behaviour
column legend:**

- `keep` — column survives unchanged.
- `rename` — column is renamed/retyped to its new home.
- `derive` — column is no longer written, becomes a SQL view / computed
  field over the new source of truth.
- `drop` — column is removed after the deprecation phases below.

| Today's field | Dimension | Target column / table | Behaviour | Trigger to advance phase |
|---|---|---|---|---|
| `role` | C | `user_org_roles.role` (rows) + `users.primary_role` | `keep` (renamed to `primary_role`); `user_org_roles` becomes authoritative | All readers cite `user_org_roles`; `primary_role` written as denorm hint only |
| `userType` | C | (duplicate of `role`) | `drop` | All readers migrated to `role` then `user_org_roles` |
| `isActive` | A | `users.account_state ∈ ('disabled', anything else)` | `derive` (then `drop`) | `account_state` rolled out; readers switched |
| `verified` | A | `users.account_state ∈ ('verified','active')` | `derive` (then `drop`) | `account_state` rolled out |
| `hasRegistered` | A | `users.account_state == 'active'` | `derive` (then `drop`) | `account_state` rolled out; both backfills retired |
| `status` ('active'/'invited') | A | `users.account_state ∈ ('shadow','invited','active')` | `derive` (then `drop`) | `account_state` rolled out |
| `inviteToken` | A (operational) | `users.invite_token` | `keep` (still the email token) | n/a |
| `inviteTokenExpiry` | A (operational) | `users.invite_token_expiry` | `keep` | n/a |
| `inviteReminderCount` | A (operational) | `users.invite_reminder_count` | `keep` | n/a |
| `lastInviteReminderAt` | A (operational) | `users.last_invite_reminder_at` | `keep` | n/a |
| `activatedAt` | A | `users.account_state_changed_at` (renamed) | `rename` | After `account_state` rollout |
| `paymentStatus` | E | view over `product_enrollments` via `computeAccessStatus` | `derive` (then `drop`) | All readers migrated to `computeAccessStatus`; `getPlayerStatusTagsBulk` rewritten off this column |
| `subscriptionEndDate` | E | `computeAccessStatus(...).accessUntil` | `derive` (then `drop`) | Same as above |
| `teamAssignmentStatus` | D | derived from existence of any `team_memberships` row with `status='active'` for this user | `derive` (then `drop`) | All readers migrated; admin-dashboard "Needs Team" computed from `team_memberships` join |
| `approvalStatus` | B | `org_memberships.state ∈ ('requested','member','rejected','removed')` | `rename` then `drop` | After `org_memberships` table is live |
| `requestedTeamId` | B | `org_memberships.requested_team_id` | `rename` | Same as above |
| `requestedOrgId` | B | `org_memberships.organization_id` for the row in state `requested` | `rename` | Same as above |
| `packageSelected` | E | `product_enrollments` row | `derive` (then `drop`) | After organic signup is rewired to create the enrollment row directly |
| `accountHolderId` | ↔ | `users.account_holder_id` | `keep` (becomes authoritative) | n/a |
| `parentId` | ↔ | `users.account_holder_id` | `derive` then `drop` | After all writers point at `account_holder_id` |
| `linkedAccountId` | C | replaced by multiple `user_org_roles` rows under one `users.id` | `derive` then `drop` | After `user_org_roles` rollout AND a one-shot merger of duplicate human rows |
| `guardianId` | ↔ | `users.account_holder_id` | `derive` then `drop` | Same as `parentId` |
| `needsLegacyClaim` | A | (special-case of `shadow`) – consult `account_state == 'shadow' && source = 'migration'` | `derive` then `drop` | After migration shadow handling lives in `account_state` |
| `flaggedForRosterChange` | D (operational) | `users.flagged_for_roster_change` (or `team_memberships.metadata`) | `keep` for now, revisit | n/a (not in critical path) |
| `flagReason` | D (operational) | `users.flag_reason` | `keep` for now | n/a |
| `defaultDashboardView` | (UX preference) | `users.default_dashboard_view` | `keep` (UX pref, not state) | n/a |
| `registrationType` ('myself'/'my_child') | (signup intent only) | dropped after registration; not a long-lived state | `drop` (use only during the wizard, never persisted to `users`) | After organic signup is rewired |

Related table changes:

- `pending_registrations` — **keep**. It correctly models "verification not
  yet completed for an email" and is independent of `users`. Its `verified`
  flag flips a `pending_registrations` row, not a `users` row.
- `pending_claims` — **keep**. Short-TTL store for the iOS claim resume
  flow; orthogonal to user state.
- `product_enrollments` — **keep, unchanged shape**. Source of truth for
  dimension E.
- `team_memberships` — **keep**. Source of truth for dimension D.
- `teams.coachId` / `headCoachIds` / `assistantCoachIds` / `managerIds` /
  `strengthCoachIds` — `derive` then `drop`. Replaced by `team_memberships`
  rows where `role` ∈ coach-style roles.

---

## 4. Edge-case walkthrough — current vs target

For each case below: how it's encoded today (with field values), how it's
encoded in the target model (with target table rows), and what the user
sees.

### 4.1 Enrolled but unpaid (admin granted access, parent never paid)

| Aspect | Today | Target |
|---|---|---|
| `users.paymentStatus` | `'pending'` | n/a (derived) |
| `users.status` | `'active'` | `account_state='active'` |
| `users.approvalStatus` | `null` | `org_membership_state='member'` |
| `product_enrollments` | `status='active', source='admin_assignment', paymentId=null` | unchanged |
| Computed access | `admin_grant`, until end date | identical |
| User sees | "Active — pay by MM/DD" banner | identical (driven by `computeAccessStatus`) |

### 4.2 Migration-invited, partial access

| Aspect | Today | Target |
|---|---|---|
| `users.status` | `'invited'` | `account_state='invited'` |
| `users.hasRegistered` | `false` | (derived) |
| `users.isActive` | `true` | (derived) |
| `users.inviteToken` | set | unchanged |
| `users.approvalStatus` | `null` | `org_membership_state='member'` (admin imported them, no approval needed) |
| `product_enrollments` | `status='active', source='migration'` | unchanged |
| User sees | "Invited" badge to admin; parent gets claim email; enrollment is honoured for access | identical |

### 4.3 Registered but no players added

| Aspect | Today | Target |
|---|---|---|
| `users.role` | `'parent'` | `primary_role='parent'`, `user_org_roles=['parent']` |
| `users.hasRegistered` | `true` | `account_state='active'` |
| Linked players | none | none |
| `org_membership_state` | (none) | `member` if they joined an org, else `none` |
| User sees | profile-gateway prompts "Add a player" | identical, but the prompt is driven by "no child rows under this account_holder" instead of `hasRegistered` |

### 4.4 Enrolled but not on a team

| Aspect | Today | Target |
|---|---|---|
| `users.teamAssignmentStatus` | `'pending'` | (derived from `team_memberships`) |
| `team_memberships` rows | none | none |
| `product_enrollments` | `status='active'` | unchanged |
| Admin dashboard tag | "Needs Team" (from `deriveUserStatus`) | identical, but computed off `team_memberships` count instead of the `teamAssignmentStatus` flag |

### 4.5 Team-requested but unassigned (parent picked a team during signup)

| Aspect | Today | Target |
|---|---|---|
| `users.approvalStatus` | `'pending'` | `org_membership_state='requested'` |
| `users.requestedTeamId` | set | `org_memberships.requested_team_id` |
| `users.requestedOrgId` | set | `org_memberships.organization_id` |
| `users.teamAssignmentStatus` | `'pending'` | (derived) |
| `users.paymentStatus` | usually `'pending'` | (derived from `product_enrollments`) |
| Admin sees | row in approval queue | identical |
| Approve action | flips `approvalStatus='approved'`, inserts `team_memberships`, often inserts `product_enrollments` | flips `org_memberships.state='member'`, inserts `team_memberships`, inserts `product_enrollments` |

### 4.6 Self-claim pending verification

| Aspect | Today | Target |
|---|---|---|
| `users.status` | `'active'` (parent is real) | `account_state='active'` |
| Player profile | new `users` row, `accountHolderId=parent` | identical |
| `product_enrollments` | `status='active', isSelfClaimed=true, selfClaimVerifiedAt=null` | unchanged |
| Admin dashboard tag | "Self-Claimed" | identical |
| Important property | the **player** has no `org_membership_state` row of their own; access flows through the parent's holder relationship and the enrollment | unchanged |

### 4.7 Tryout vs full member

| Aspect | Today | Target |
|---|---|---|
| `team_memberships.status` | `'tryout'` | unchanged |
| `product_enrollments.isTryout` | `true` | unchanged |
| `users.approvalStatus` | varies | `org_membership_state='member'` (a tryout-attendee is still a member, just on a tryout) |
| Admin sees | "Tryout" badge | identical |

### 4.8 Multi-role same human (coach who is also a parent)

| Aspect | Today | Target |
|---|---|---|
| User row count | usually two rows joined by `linkedAccountId` | one `users` row |
| `users.role` | one of `'coach'` or `'parent'` per row | `primary_role` set to the user's preferred dashboard, both roles recorded in `user_org_roles` |
| Children | hang off whichever row is the parent | hang off the single `users.id` via `account_holder_id` |
| Sign-in | switching context requires the dual-row `linkedAccountId` dance | one login; profile gateway lets the human pick which dashboard to enter, driven by `user_org_roles` |
| Migration | one-shot merger of duplicate rows where same email + same org + `linkedAccountId` set | n/a (already merged) |

### 4.9 Stranded migration shadow (admin imported, never invited)

| Aspect | Today | Target |
|---|---|---|
| `users.status` | `'active'` (default) | `account_state='shadow'` |
| `users.hasRegistered` | `false` | (derived) |
| `users.isActive` | `true` | (derived) |
| `users.password` | `null` | `null` |
| `users.inviteToken` | `null` | `null` |
| Backfill needed today | yes — `backfillStrandedInvites.ts` flips them to `'invited'` and mints a fresh token | **no** — `account_state='shadow'` is the natural state; admin sends invite when ready |

This is a flagship win: the entire `backfillStrandedInvites.ts` script
becomes unnecessary because there is no longer a way for the row to land
in an inconsistent combination of `status`, `hasRegistered`, and
`inviteToken`.

---

## 5. UX rescope — registration, invite, add-player

This chapter respecifies each user-facing flow in terms of which
dimensions it touches and which transitions it produces. Wireframes are
out of scope; the behaviour is what's normative here.

### 5.1 Organic signup (myself vs my_child)

Today: the `registration-flow.tsx` wizard collects parent info, optional
player info, an org/team pick, then writes a thicket of fields including
`registrationType`, `requestedOrgId`, `requestedTeamId`, `approvalStatus`,
`packageSelected`.

Rescoped:

1. **Email step.** Inserts/updates a `pending_registrations` row. No
   `users` row yet.
2. **Verify step.** Email click flips `pending_registrations.verified=true`.
3. **Profile step (myself).** Creates one `users` row,
   `account_state='verified'`, `account_holder_id=NULL`, `primary_role`
   chosen from "I'm signing up as a player / parent / coach". Sets
   password → `account_state='active'`.
4. **Profile step (my_child).** Creates the parent `users` row exactly as
   above, plus one or more child `users` rows with `account_holder_id =
   parent.id`, `primary_role='player'`, `account_state='shadow'`.
5. **Org/team selection step.** Inserts an `org_memberships` row in state
   `requested` (if admin approval is required) or `member` (if not).
   Inserts the matching `requested_team_id` on that row. Touches **no
   other field**.
6. **Package step (optional).** Inserts a `product_enrollments` row in
   `status='pending'` (or `'active'` if the org auto-grants free trials).
   Touches **no other field**.

The `registrationType` value lives only in the wizard's local state. It is
not persisted.

### 5.2 Migration invite send

Today: admin uses the migration wizard, server creates shadow `users` rows
with `status='invited'`, `hasRegistered=false`, `inviteToken=...`, plus
`product_enrollments` with `source='migration'`.

Rescoped:

- Shadow `users` row: `account_state='shadow'`, `account_holder_id` set
  appropriately for child rows.
- Sending the email: `account_state='shadow' → 'invited'` AND mint
  `invite_token`.
- `org_memberships` row inserted in state `member` (admin import implies
  acceptance — there's no "approval queue" step for migration imports).
- `product_enrollments` row inserted in `status='active', source='migration'`.

### 5.3 Migration invite claim

Today: claim endpoint flips `status='active'`, `hasRegistered=true`, sets
password, clears `inviteToken`, calls `activateSameEmailSiblingProfiles`
to ripple the same change across linked child rows.

Rescoped:

- Flips `account_state` `invited → verified` (email proven by token) →
  `active` (password set), in one atomic write.
- For each child row under the same `account_holder_id`: those are still
  `account_state='shadow'` (they're profiles, not real sign-ins). They do
  **not** flip to `active` — the rippling pass that exists today
  (`activateSameEmailSiblingProfiles`) is no longer needed because the
  child rows were never tracking the same dimension as the parent.
- The "Invited" badge that shows on the admin Users tab is computed from
  `account_state ∈ ('shadow','invited')`, so it disappears the moment the
  parent claims. No separate clear-pass is needed.

### 5.4 Parent add-player from profile gateway

Today: three modes — `pending-approval`, `no-package`, `with-package` —
which produce different combinations of `approvalStatus`, `paymentStatus`,
and `packageSelected`.

Rescoped: the three "modes" become the three combinations of two
independent dimensions, B and E:

| Wizard outcome | Org membership (B) | Enrollment (E) | Resulting UX |
|---|---|---|---|
| Mode A: parent picks "request approval" (no package picked) | child gets `org_memberships` row in state `requested` | none | profile gateway shows "Awaiting Approval" |
| Mode B: parent picks org but no package, no admin approval needed | `member` | none | profile gateway shows "Payment Due" / pay flow |
| Mode C: parent picks org and a package, paid in checkout | `member` | `active` (paid) | profile gateway routes straight to dashboard |

The three flows never touch `users.paymentStatus` or
`users.teamAssignmentStatus` directly.

### 5.5 Admin approval queue

Today: queries `users` for `approvalStatus='pending'` filtered by org;
approve writes `approvalStatus='approved'` and optionally creates an
enrollment.

Rescoped: queries `org_memberships` for `state='requested', organization_id=...`.
Approve flips `state='member'`, inserts `team_memberships` for the
requested team, and (if the admin chose a package or grant) inserts a
`product_enrollments` row. Reject flips `state='rejected'` and notifies
the parent. Nothing on `users` changes.

### 5.6 Bulk resend invites

Today: walks `users` for `status='invited'` and re-mints `inviteToken`,
guarded by reminder count.

Rescoped: walks `users` for `account_state ∈ ('shadow','invited')`, same
reminder bookkeeping. Flips `shadow → invited` on first send.

### 5.7 Open product questions and recommended answers

For each question below: the recommended answer, why it's recommended,
and the explicit consequences of choosing the alternative instead.

**Q1. Do we need both `shadow` and `invited`, or is the presence of
`invite_token` enough?**
- **Recommendation: keep both.** Reminder cadence and "this row was
  never even contacted" are different operational concerns; conflating
  them is what produced the stranded-shadow class of bug.
- *Alternative — collapse `shadow` into `invited` and use `invite_token IS
  NULL` as the "uncontacted" signal:* re-introduces the legacy drift
  pattern where token rotation and reminder counters diverge from the
  conceptual state. Saves one enum value at the cost of restoring the
  exact bug class this redesign exists to eliminate.

**Q2. Can a parent account exist with zero child profiles?**
- **Recommendation: yes.** Already happens (parent signs up before
  adding kids). UX prompts for add-player but does not block.
- *Alternative — block parent sign-up until at least one child exists:*
  forces every "I want to look around first" parent to fabricate a
  child profile, polluting the user table with junk rows that admins
  must later clean up. Also breaks the migration path where parents
  need to claim before their imported children appear.

**Q3. Can a player exist with no parent (`account_holder_id=NULL`)?**
- **Recommendation: yes, only if `primary_role='player'` AND age ≥ 18.**
  Otherwise no.
- *Alternative — every player must always have a holder:* requires
  fabricating a "self holder" for every adult athlete, doubling the
  row count and forcing the parent–child FK to point at itself, which
  every household-expansion query then has to special-case.

**Q4. Can someone register "as myself" with no team picked?**
- **Recommendation: yes.** Drops them into an `org_memberships`
  row with `state='requested'` and `requested_team_id=NULL`, or no
  `org_memberships` row at all if no org is picked; profile gateway
  prompts to join.
- *Alternative — require team selection at signup:* blocks valid
  use-cases (organic discovery, browse-before-commit, "I'll join later
  once I see my coach") and forces every signup wizard to surface the
  full team list to users who can't pick yet.

**Q5. Should organic signup and migration claim share one claim screen?**
- **Recommendation: yes — unify on one `/claim/:token` screen** that
  branches on whether the email already has a `users` row. Removes a
  whole duplicated client surface; reduces test matrix.
- *Alternative — keep two distinct screens:* doubles the deep-link and
  email-link surface area (already a recurring source of bugs — see the
  "fix-android-email-verification" / "fix-claim-account-redirect" /
  "fix-ios-deep-link-cold-start-race" history) and forces every future
  auth-flow change to land in two places.

**Q6. What is the expiry policy for stranded shadows that are never
invited?**
- **Recommendation: no automatic expiry.** Admin can delete from the
  Users tab. A `shadow` is a deliberate import — silently deleting them
  would lose admin work.
- *Alternative — auto-delete shadows after N days uninvited:* destroys
  prepared rosters for orgs whose admin paused mid-import (a real
  pattern), and creates anxiety about "did the system delete my work?".
  Also re-introduces a nightly background job we were trying to retire.

**Q7. When a parent claims, do their child profiles auto-graduate from
`shadow` to anything?**
- **Recommendation: no.** Children are profiles, not separate sign-ins.
  They stay `shadow` forever; the access decision flows through the
  parent's `account_state` and the enrollment.
- *Alternative — auto-flip child profiles to `active` when the parent
  claims:* re-creates the
  `activateSameEmailSiblingProfiles` rippling pass that this redesign
  exists to eliminate, and wrongly implies that a child profile is a
  signed-in account.

**Q8. Tryout players: are they `org_memberships.state='member'` or a
separate state?**
- **Recommendation: `member`,** with the tryout signal living entirely
  on `team_memberships.status='tryout'` and
  `product_enrollments.isTryout=true`. Keeps B orthogonal to D and E.
- *Alternative — add a `tryout_member` state on `org_memberships`:*
  couples B to D (a tryout is fundamentally about a team membership,
  not about org membership), so any tryout state-machine change would
  force every org-membership reader to add a `tryout_member` clause,
  defeating the orthogonality goal of this whole redesign.

---

## 6. Org-onboarding questions

When an admin creates an org, BoxStat asks a small number of questions
that gate which registration questions get asked of users and which fields
on `organizations.terminology` / `organizations.features` get filled in.

Recommended question set (each maps to existing `organizations` columns
unless noted):

1. **Org name + subdomain** → `organizations.name`, `organizations.subdomain`.
2. **Sport** → `organizations.sportType`.
3. **Terminology preset** ("standard sports" / "academy" / "fitness studio"
   / "club"). Choosing a preset bulk-fills the `terminology` blob; admin
   can override per-field later. Drives whether the user-facing flows say
   "Player" / "Athlete" / "Student", "Team" / "Squad" / "Group", etc.
4. **Approval mode** ("auto-accept anyone who picks our org during
   signup" vs "admin approves each request"). Drives whether organic
   signup writes `org_memberships.state='member'` or `'requested'`. New
   field: `organizations.signup_approval_mode ∈ ('auto','manual')`.
5. **Invite-only mode** ("only people we invite by email can join"). When
   `true`, organic signup cannot pick this org at all — only the migration
   invite path or admin manual add creates members. New field:
   `organizations.invite_only`.
6. **Default registration intent** (myself / my_child / either). Pre-fills
   the first question of the registration wizard. New field:
   `organizations.default_registration_intent`.

Stripe Connect onboarding state, platform subscription state, and the
fully editable terminology blob are **future work** — they exist already
on `organizations` and are out of scope for this redesign.

---

## 7. Phased migration plan

Every phase respects the **no-breakage rule**: every legacy read path keeps
working until the phase that retires it. No column is dropped before a
prior phase has switched all readers off it.

Phase numbering is shippable order; each phase is independently reversible.

### Phase 1 — Add `account_state` (read-from-new, write-both)

- Add `users.account_state` enum column with NULL allowed.
- Backfill from `(isActive, verified, hasRegistered, status, password)` per
  the truth table:

| `isActive` | `verified` | `hasRegistered` | `status` | `password` | `account_state` |
|---|---|---|---|---|---|
| false | * | * | * | * | `disabled` |
| true | * | * | `'invited'` | null | `invited` |
| true | * | false | * | null | `shadow` |
| true | true | * | * | null | `verified` |
| true | * | true | * | not null | `active` |
| true | * | * | * | not null | `active` |

- All writers updated to **also** write `account_state` whenever they touch
  any of the legacy fields.
- New code MUST read `account_state`. Old code keeps reading the legacy
  fields.
- Verification: `account_state` matches the truth-table over the full
  table after each write. Add a CI invariant test.
- Rollback: drop the column.

### Phase 2 — Cut readers over to `account_state`

- Replace every read of `isActive`/`verified`/`hasRegistered`/`status` in
  `server/routes.ts`, `server/lib/users-list.ts`, the admin dashboard,
  the profile gateway, etc., with reads of `account_state`.
- `buildClearInvitedFlagsUpdate` and `activateSameEmailSiblingProfiles`
  collapse into a single `setAccountState(userId, 'active')` call.
- Both backfill scripts (`backfillStrandedInvites`,
  `backfillRegisteredInviteFlags`) become **no-ops** — they should detect
  zero rows. Leave them in place as canaries for one release before
  deleting.
- Verification: backfill canaries report zero rows for two weeks.
- Rollback: revert to reading legacy fields (they're still being written).

### Phase 3 — Stop writing legacy account fields

- Writers stop writing `isActive`, `verified`, `hasRegistered`, `status`.
- Backfills are deleted.

### Phase 4 — Drop legacy account columns

- Drop `isActive`, `verified`, `hasRegistered`, `status`. Keep
  `activatedAt` renamed to `account_state_changed_at`.

### Phase 5 — Add `org_memberships` table (read-from-new, write-both)

- New table per §2.B.
- Backfill: for every `users` row with `organizationId`, insert a row
  `(user_id, organization_id, state)` where `state` derives from
  `approvalStatus` (`'pending' → 'requested', 'rejected' → 'rejected',
  null/'approved' → 'member'`). Backfill `requested_team_id` from
  `users.requestedTeamId`.
- All writers updated to write both.
- Verification: row counts match per (user, org); admin queues unchanged.
- Rollback: drop the table.

### Phase 6 — Cut readers over to `org_memberships`

- Admin approval queue, profile gateway, multi-org checks all read from
  `org_memberships`.
- `requestedOrgId` / `requestedTeamId` / `approvalStatus` reads removed.

### Phase 7 — Stop writing legacy org-membership fields

### Phase 8 — Drop legacy org-membership columns

- Drop `users.approvalStatus`, `users.requestedOrgId`,
  `users.requestedTeamId`. Keep `users.organizationId` for now (still the
  fast "primary org" hint).

### Phase 9 — Add `user_org_roles` table (read-from-new, write-both)

- New table per §2.C.
- Backfill: insert one row per (user, organization, role) from `users.role`
  (and a second row whenever `linkedAccountId` proves the same human is
  also another role in the same org).
- Add `users.primary_role` (denorm hint).
- Verification: `user_org_roles` row count ≥ count of distinct
  (user, org) pairs.

### Phase 10 — Cut readers over to `user_org_roles`

- All authorization checks read `user_org_roles`.
- `users.role` and `users.userType` reads removed.

### Phase 11 — Merge duplicated humans (`linkedAccountId`)

- One-shot merger: for every pair of `users` rows joined by
  `linkedAccountId`, pick a canonical row, move all child profiles, team
  memberships, enrollments, and `user_org_roles` rows to it, and soft-delete
  the duplicate.
- This is the only destructive data-shape change in the plan; it ships
  alone in its own release with explicit per-org dry-run + report.

### Phase 12 — Stop writing `users.role`, `users.userType`, `users.linkedAccountId`

### Phase 13 — Drop `users.role`, `users.userType`, `users.linkedAccountId`

### Phase 14 — Derive `paymentStatus` and `subscriptionEndDate`

- Replace every read of `users.paymentStatus` and `users.subscriptionEndDate`
  with calls into `computeAccessStatus`/`evaluatePlayerAccess`.
- `getPlayerStatusTagsBulk` rewritten to source its `payment_due` /
  `low_balance` decisions from `product_enrollments` only.
- Verification: side-by-side compare of the old vs new tag for every player
  for two weeks. Disagreements logged; zero disagreements before advancing.

### Phase 15 — Stop writing `paymentStatus`, `subscriptionEndDate`, `packageSelected`

### Phase 16 — Drop `paymentStatus`, `subscriptionEndDate`, `packageSelected`

### Phase 17 — Derive `teamAssignmentStatus`

- All readers replaced with `team_memberships` joins.
- `enforce-enrollment-before-team-assignment` (existing follow-up #246)
  still applies but reads `org_memberships` and `product_enrollments`
  directly.

### Phase 18 — Stop writing `teamAssignmentStatus`

### Phase 19 — Drop `teamAssignmentStatus`

### Phase 20 — Unify parent–child FK on `account_holder_id`

- Backfill `account_holder_id` from `parentId`/`guardianId` where currently
  NULL.
- Cut all readers over.
- Drop `parentId` and `guardianId`.

### Phase 21 — Drop denormalised coach arrays on `teams`

- Replace every read of `teams.coachId`, `headCoachIds`, `assistantCoachIds`,
  `managerIds`, `strengthCoachIds` with a `team_memberships` join filtered
  by role.
- Stop writing them. Drop them.

### Phase 22 — Cleanup

- Drop `needsLegacyClaim` (subsumed by `account_state='shadow'` + a
  source-tag column on a future enrollments table if needed).
- Drop `registrationType` (was never long-lived state).
- Audit nightly invariant test that walks `users` and asserts every row
  has internally-consistent state across all five dimensions.

---

## 8. Impact on existing PROPOSED follow-up tasks

| Task | Title (paraphrase) | Disposition |
|---|---|---|
| #235 | Stranded shadow expiry policy | **subsumed-by-redesign** — Phase 1+ removes the class of bug; Q6 documents the deliberate "no expiry" decision. |
| #236 | Backfill stranded invites improvement | **subsumed-by-redesign** — script deleted in Phase 3. |
| #237 | Backfill registered-invite flags improvement | **subsumed-by-redesign** — script deleted in Phase 3. |
| #245 | Enforce enrollment before team assignment | **still-needed-after-redesign** — re-scope to read from `org_memberships` + `product_enrollments` per Phase 17. |
| #246 | Team assignment grants unpaid member | **re-scope-after-redesign** — the bug is real today; after Phase 17 the fix lives in the team-assign route, not in syncing flag fields. |
| #247 | Exclude invited players from roster | **re-scope-after-redesign** — Phase 2 unifies the "invited" check on `account_state`. |
| #250 | Clear Invited badge after Google/Apple sign-in | **subsumed-by-redesign** — `account_state` advances on first successful login; no clear-pass needed. |
| #251 | Automated coverage for the Invited-badge clearing flow | **re-scope-after-redesign** — coverage target becomes "`account_state='invited' → 'active'` happens on every sign-in path". |
| #258 | Show admins which users are stuck on verification | **still-needed-after-redesign** — re-scope to query `account_state='verified'`. |
| #259 | Audit trail of admin verification resends | **still-needed-after-redesign** — orthogonal. |
| #260 | Find active users with no expiry date set | **still-needed-after-redesign** — re-scope to "members with no active enrollment" (joins `org_memberships` + `product_enrollments`). |
| #262 | Invited-users reminder cadence + dedupe | **re-scope-after-redesign** — dedup logic gets simpler when "Invited" is one field. |
| #312 | Show approved game stats on player profile pages | **still-needed-after-redesign** — unrelated to user state. |

---

## 9. Self-review checklist

- [x] Every existing state-bearing field on `users` appears in §3.
- [x] Each of the five dimensions has explicit allowed transitions and an
  explicit independence statement (§2).
- [x] Every phase in §7 keeps the prior read path working until the phase
  that retires it (the "no-breakage rule").
- [x] Every open product question (Q1–Q8) has a recommended answer and a
  reason (§5.7).
- [x] All five user-named overlapping cases are walked through with target
  encodings (§4.1–4.5), plus the four surfaced during analysis
  (§4.6–4.9).
- [x] All listed tasks (#235, #236, #237, #245, #246, #247, #250, #251,
  #258, #259, #260, #262, #312) have a disposition (§8).
- [x] `shared/access-status.ts` and `shared/access-gate.ts` are treated as
  authoritative for dimension E and are not redesigned.
- [x] No code, schema, or migration is changed by this task.

---

## 10. Out of scope reminders

- **Stripe Connect onboarding state**, **platform subscription state**,
  and the editable **terminology blob** are not redesigned here. Their
  current shape on `organizations` is kept.
- **Implementation tasks** for any of the phases above will be drafted as
  a separate batch after this doc is approved.
- **Re-litigating** the `product_enrollments` access-status model is out of
  scope — it stays as-is.
- **Wireframes / mockups** for the rescoped flows are not produced here;
  the behavioural spec in §5 is the contract.
