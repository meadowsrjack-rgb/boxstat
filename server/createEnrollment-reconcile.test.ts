import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Task #326 server-side integration coverage. Asserts that
 * `storage.createEnrollment` cancels every other still-active unpaid
 * `admin_assignment` / `self_claim` row for the same player + program
 * once a payment-backed enrollment is created — both when the
 * canonical row is upgraded in place and when a fresh paid row is
 * inserted alongside leftover duplicates.
 *
 * Uses a small in-memory drizzle-shaped adapter to stand in for the
 * real Postgres pool so the test stays hermetic.
 */

interface Row {
  id: number;
  organizationId: string;
  programId: string;
  accountHolderId: string;
  profileId: string | null;
  status: string;
  source: string | null;
  paymentId: string | null;
  stripeSubscriptionId: string | null;
  startDate: string | null;
  endDate: string | null;
  autoRenew: boolean | null;
  totalCredits: number | null;
  remainingCredits: number | null;
  isTryout: boolean | null;
  recommendedTeamId: number | null;
  metadata: Record<string, unknown> | null;
  isSelfClaimed: boolean | null;
  selfClaimedEndDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

const enrollments: Row[] = [];
let nextId = 1;

const snakeToCamel = (s: string): string =>
  s.replace(/_([a-z])/g, (_m, ch: string) => ch.toUpperCase());

const matchesEnrollmentFilter = (row: Row, filter: Record<string, unknown>): boolean => {
  for (const [k, v] of Object.entries(filter)) {
    if (k === "_notId") {
      if (row.id === v) return false;
      continue;
    }
    if (k === "_in_source") {
      if (!Array.isArray(v) || !v.includes(row.source)) return false;
      continue;
    }
    if (k === "_isNull") {
      const fields = v as string[];
      for (const f of fields) {
        if ((row as any)[snakeToCamel(f)] != null) return false;
      }
      continue;
    }
    if (k === "_or") {
      // Synthetic disjunction emitted by the fake `or(...)` helper.
      const disjuncts = v as Record<string, unknown>[];
      const anyMatches = disjuncts.some((d) => matchesEnrollmentFilter(row, d));
      if (!anyMatches) return false;
      continue;
    }
    if (k === "_ors") {
      // Multiple OR clauses collected by the fake `and(...)` reducer; each
      // disjunction must independently match.
      const ors = v as Record<string, unknown>[][];
      for (const disjuncts of ors) {
        const anyMatches = disjuncts.some((d) => matchesEnrollmentFilter(row, d));
        if (!anyMatches) return false;
      }
      continue;
    }
    if (k === "_ne") continue;
    if ((row as any)[snakeToCamel(k)] !== v) return false;
  }
  return true;
};

// We replace drizzle's expression builders with simple objects that we can
// interpret in our fake `db.select/update`. The shape doesn't matter as
// long as each call produces a deterministic descriptor we can decode.

interface PendingFilter {
  filter: Record<string, unknown>;
}

const makeWhere = (rows: Row[]) => ({
  filter: {} as Record<string, unknown>,
  rows,
});

vi.mock("./db", () => {
  return {
    db: {
      select: () => ({
        from: () => ({
          where: (cond: PendingFilter) => {
            const filtered = enrollments.filter((r) => matchesEnrollmentFilter(r, cond.filter));
            const thenable: any = {
              limit: (n: number) => Promise.resolve(filtered.slice(0, n)),
              then: (resolve: (rows: Row[]) => unknown) => Promise.resolve(filtered).then(resolve),
            };
            return thenable;
          },
        }),
      }),
      insert: () => ({
        values: (data: Partial<Row>) => ({
          returning: () => {
            const row: Row = {
              id: nextId++,
              organizationId: data.organizationId || "",
              programId: data.programId || "",
              accountHolderId: data.accountHolderId || "",
              profileId: data.profileId ?? null,
              status: data.status ?? "active",
              source: data.source ?? null,
              paymentId: data.paymentId ?? null,
              stripeSubscriptionId: data.stripeSubscriptionId ?? null,
              startDate: data.startDate ?? null,
              endDate: data.endDate ?? null,
              autoRenew: data.autoRenew ?? null,
              totalCredits: data.totalCredits ?? null,
              remainingCredits: data.remainingCredits ?? null,
              isTryout: data.isTryout ?? null,
              recommendedTeamId: data.recommendedTeamId ?? null,
              metadata: (data.metadata as Record<string, unknown>) ?? null,
              isSelfClaimed: data.isSelfClaimed ?? null,
              selfClaimedEndDate: data.selfClaimedEndDate ?? null,
              createdAt: data.createdAt ?? new Date().toISOString(),
              updatedAt: data.updatedAt ?? new Date().toISOString(),
            };
            enrollments.push(row);
            return Promise.resolve([row]);
          },
        }),
      }),
      update: () => ({
        set: (patch: Partial<Row>) => ({
          where: (cond: PendingFilter) => {
            const matched = enrollments.filter((r) => matchesEnrollmentFilter(r, cond.filter));
            for (const m of matched) Object.assign(m, patch);
            const thenable: any = {
              returning: () => Promise.resolve(matched.map((r) => ({ ...r }))),
              then: (resolve: (rows: Row[]) => unknown) =>
                Promise.resolve(matched.map((r) => ({ ...r }))).then(resolve),
            };
            return thenable;
          },
        }),
      }),
      query: {},
      execute: vi.fn(),
    },
    pool: { connect: vi.fn() },
  };
});

// Replace drizzle-orm's expression builders with descriptor builders that
// our fake db can decode. We only need to support the fields used by
// `createEnrollment` and `cancelDuplicateUnpaidEnrollments`.
vi.mock("drizzle-orm", async () => {
  const actual = await vi.importActual<any>("drizzle-orm");
  const fieldName = (col: any): string => {
    if (typeof col === "string") return col;
    if (col && typeof col === "object" && "name" in col) return String(col.name);
    return "";
  };
  return {
    ...actual,
    eq: (col: any, value: unknown) => ({ filter: { [fieldName(col)]: value } }),
    ne: (col: any, value: unknown) => ({ filter: { _notId: value, _ne: fieldName(col) } }),
    isNull: (col: any) => ({ filter: { _isNull: [fieldName(col)] } }),
    isNotNull: (col: any) => ({ filter: { _isNotNull: [fieldName(col)] } }),
    inArray: (col: any, values: unknown[]) => ({
      filter:
        fieldName(col) === "source"
          ? { _in_source: values }
          : { [`_in_${fieldName(col)}`]: values },
    }),
    and: (...conds: PendingFilter[]) => ({
      filter: conds.reduce<Record<string, unknown>>((acc, c) => {
        if (!c) return acc;
        for (const [k, v] of Object.entries(c.filter)) {
          if (k === "_isNull" && Array.isArray(acc._isNull)) {
            (acc._isNull as string[]).push(...(v as string[]));
          } else if (k === "_or") {
            // Multiple OR clauses inside an AND need to be preserved as
            // separate disjunctions — collect them under _ors so
            // matchesEnrollmentFilter can require all of them to match.
            const ors = (acc._ors as Record<string, unknown>[][] | undefined) ?? [];
            ors.push(v as Record<string, unknown>[]);
            acc._ors = ors;
          } else {
            acc[k] = v;
          }
        }
        return acc;
      }, {}),
    }),
    or: (...conds: PendingFilter[]) => ({
      // The fake filter language is a flat object of clauses ANDed together;
      // to express OR, we stash the disjuncts under a synthetic _or key that
      // matchesEnrollmentFilter treats as "row matches if ANY disjunct
      // matches". Each disjunct is itself a flat AND filter.
      filter: { _or: conds.filter(Boolean).map((c) => c.filter) },
    }),
    sql: actual.sql,
  };
});

// Pull in the storage module AFTER the mocks above so it picks up our fakes.
let DatabaseStorage: any;

beforeEach(async () => {
  enrollments.length = 0;
  nextId = 1;
  if (!DatabaseStorage) {
    const mod = await import("./storage-impl");
    DatabaseStorage = mod.DatabaseStorage;
  }
});

const seedEnrollment = (over: Partial<Row>): Row => {
  const row: Row = {
    id: nextId++,
    organizationId: "org-1",
    programId: "program-A",
    accountHolderId: "parent-1",
    profileId: "player-jack",
    status: "active",
    source: "admin_assignment",
    paymentId: null,
    stripeSubscriptionId: null,
    startDate: new Date().toISOString(),
    endDate: null,
    autoRenew: false,
    totalCredits: null,
    remainingCredits: null,
    isTryout: false,
    recommendedTeamId: null,
    metadata: { grantedBy: "admin-1" },
    isSelfClaimed: false,
    selfClaimedEndDate: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...over,
  };
  enrollments.push(row);
  return row;
};

describe("Task #326 — storage.createEnrollment payment-path reconciliation", () => {
  it("upgrades the existing admin_assignment grant in place and cancels other unpaid duplicates for the same player+program", async () => {
    const grant = seedEnrollment({ source: "admin_assignment" });
    const dupe = seedEnrollment({ source: "self_claim" });

    const storage = new DatabaseStorage();
    const result = await storage.createEnrollment({
      organizationId: "org-1",
      programId: "program-A",
      accountHolderId: "parent-1",
      profileId: "player-jack",
      status: "active",
      source: "payment",
      paymentId: "pi_paid",
      stripeSubscriptionId: null,
      endDate: new Date(Date.now() + 90 * 86400_000).toISOString(),
      metadata: {},
    });

    // Returned row is the upgraded original grant (preserves audit trail).
    expect(result.id).toBe(grant.id);
    expect(result.paymentId).toBe("pi_paid");
    expect(result.status).toBe("active");

    // The leftover self_claim duplicate is now cancelled with audit metadata.
    const reloadedDupe = enrollments.find((r) => r.id === dupe.id)!;
    expect(reloadedDupe.status).toBe("cancelled");
    expect(reloadedDupe.metadata).toMatchObject({
      cancelledReason: "duplicate_paid_enrollment_exists",
      replacedByEnrollmentId: grant.id,
    });
    // Pre-existing metadata is preserved.
    expect(reloadedDupe.metadata).toMatchObject({ grantedBy: "admin-1" });
  });

  it("cancels unpaid duplicates even when a fresh paid row is inserted (no in-place upgrade match)", async () => {
    // No existing admin_assignment / self_claim row to upgrade — only an
    // active self_claim row that we want retired once payment lands. We
    // simulate the payment-success path inserting a brand-new payment row
    // by writing the paid enrollment with `source: 'admin_assignment'`
    // (which the upgrade gate explicitly skips), proving the cleanup
    // also kicks in on the post-insert path.
    const dupe = seedEnrollment({ source: "self_claim" });

    const storage = new DatabaseStorage();
    const result = await storage.createEnrollment({
      organizationId: "org-1",
      programId: "program-A",
      accountHolderId: "parent-1",
      profileId: "player-jack",
      status: "active",
      source: "admin_assignment",
      paymentId: "pi_fresh",
      stripeSubscriptionId: null,
      endDate: new Date(Date.now() + 90 * 86400_000).toISOString(),
      metadata: {},
    });

    expect(result.id).not.toBe(dupe.id);
    expect(result.paymentId).toBe("pi_fresh");
    const reloadedDupe = enrollments.find((r) => r.id === dupe.id)!;
    expect(reloadedDupe.status).toBe("cancelled");
    expect(reloadedDupe.metadata).toMatchObject({
      cancelledReason: "duplicate_paid_enrollment_exists",
      replacedByEnrollmentId: result.id,
    });
  });

  it("does NOT cancel the unpaid grant when a non-payment-backed enrollment is created", async () => {
    const grant = seedEnrollment({ source: "admin_assignment" });

    const storage = new DatabaseStorage();
    await storage.createEnrollment({
      organizationId: "org-1",
      programId: "program-A",
      accountHolderId: "parent-1",
      profileId: "player-jack",
      status: "active",
      source: "direct",
      paymentId: null,
      stripeSubscriptionId: null,
      endDate: new Date(Date.now() + 30 * 86400_000).toISOString(),
      metadata: {},
    });

    const reloaded = enrollments.find((r) => r.id === grant.id)!;
    expect(reloaded.status).toBe("active");
    expect(reloaded.metadata).not.toHaveProperty("cancelledReason");
  });

  // Task #332: the upgrade gate must not depend on the existing row's
  // `source`. Any unpaid active row for the same player+program is a
  // valid upgrade target — including rows created via the user-PATCH
  // unified flow ("admin"), the legacy direct path ("direct"), the
  // migration importer ("migration"), the bulk CSV importer ("import"),
  // and even an old "payment" row whose payment never landed.
  describe("Task #332 — collapse works regardless of the existing row's source", () => {
    const NON_GRANT_SOURCES = ["admin", "direct", "migration", "import", "payment", "quote"] as const;

    it.each(NON_GRANT_SOURCES.map((s) => [s]))(
      "upgrades an existing unpaid row with source=%s in place when a paid enrollment lands",
      async (existingSource) => {
        const existing = seedEnrollment({ source: existingSource });

        const storage = new DatabaseStorage();
        const result = await storage.createEnrollment({
          organizationId: "org-1",
          programId: "program-A",
          accountHolderId: "parent-1",
          profileId: "player-jack",
          status: "active",
          source: "payment",
          paymentId: "pi_paid",
          stripeSubscriptionId: null,
          endDate: new Date(Date.now() + 90 * 86400_000).toISOString(),
          metadata: {},
        });

        // The original row was upgraded in place — same id preserved.
        expect(result.id).toBe(existing.id);
        expect(result.paymentId).toBe("pi_paid");
        expect(result.source).toBe("payment");
        expect(result.status).toBe("active");
        expect((result.metadata as any).upgradedFromSource).toBe(existingSource);

        // No second active row sneaks in.
        const activeForPair = enrollments.filter(
          (r) =>
            r.profileId === "player-jack" && r.programId === "program-A" && r.status === "active",
        );
        expect(activeForPair).toHaveLength(1);
      },
    );

    it("collapses leftover unpaid rows with mixed sources (admin + direct + migration) when payment lands", async () => {
      const adminRow = seedEnrollment({ source: "admin" });
      const directRow = seedEnrollment({ source: "direct" });
      const migrationRow = seedEnrollment({ source: "migration" });

      const storage = new DatabaseStorage();
      const result = await storage.createEnrollment({
        organizationId: "org-1",
        programId: "program-A",
        accountHolderId: "parent-1",
        profileId: "player-jack",
        status: "active",
        source: "payment",
        paymentId: "pi_paid",
        stripeSubscriptionId: null,
        endDate: new Date(Date.now() + 90 * 86400_000).toISOString(),
        metadata: {},
      });

      // One of the three was upgraded in place. The other two were collapsed
      // with explanatory metadata.
      const winnerId = result.id;
      const allThree = [adminRow.id, directRow.id, migrationRow.id];
      expect(allThree).toContain(winnerId);
      const winner = enrollments.find((r) => r.id === winnerId)!;
      expect(winner.status).toBe("active");
      expect(winner.paymentId).toBe("pi_paid");

      const losers = allThree.filter((id) => id !== winnerId).map((id) => enrollments.find((r) => r.id === id)!);
      for (const loser of losers) {
        expect(loser.status).toBe("cancelled");
        expect(loser.metadata).toMatchObject({
          cancelledReason: "duplicate_paid_enrollment_exists",
          replacedByEnrollmentId: winnerId,
        });
        expect((loser.metadata as any).cancelledFromSource).toBe(loser.source);
      }

      // Net active rows for the pair: exactly one.
      const activeForPair = enrollments.filter(
        (r) =>
          r.profileId === "player-jack" && r.programId === "program-A" && r.status === "active",
      );
      expect(activeForPair).toHaveLength(1);
    });

    // Regression for the code-review finding on Task #332: `isTryout` is
    // nullable in the schema (default false but no NOT NULL constraint).
    // Long-lived datasets carry rows where the column is literally NULL.
    // Both the upgrade gate and the duplicate-cancel pass must include
    // those legacy rows — otherwise they'd silently slip past the dedup
    // logic and a duplicate Active row would be left behind.
    it("upgrades a legacy unpaid row whose isTryout column is NULL", async () => {
      const legacy = seedEnrollment({ source: "admin", isTryout: null as any });

      const storage = new DatabaseStorage();
      const result = await storage.createEnrollment({
        organizationId: "org-1",
        programId: "program-A",
        accountHolderId: "parent-1",
        profileId: "player-jack",
        status: "active",
        source: "payment",
        paymentId: "pi_paid",
        stripeSubscriptionId: null,
        endDate: new Date(Date.now() + 90 * 86400_000).toISOString(),
        metadata: {},
      });

      // Upgraded in place.
      expect(result.id).toBe(legacy.id);
      expect(result.paymentId).toBe("pi_paid");
      expect((result.metadata as any).upgradedFromSource).toBe("admin");

      // Net active rows for the pair: exactly one.
      const activeForPair = enrollments.filter(
        (r) =>
          r.profileId === "player-jack" && r.programId === "program-A" && r.status === "active",
      );
      expect(activeForPair).toHaveLength(1);
    });

    it("cancels a legacy unpaid duplicate (isTryout=NULL) when a fresh paid row is inserted", async () => {
      // Seed two existing unpaid leftovers — one with isTryout=null (legacy),
      // one with isTryout=false (modern). Then trigger an upgrade so the
      // first one becomes paid; the cancel-duplicates pass must catch the
      // second.
      const legacy = seedEnrollment({ source: "admin", isTryout: null as any });
      const modern = seedEnrollment({ source: "direct", isTryout: false });

      const storage = new DatabaseStorage();
      const result = await storage.createEnrollment({
        organizationId: "org-1",
        programId: "program-A",
        accountHolderId: "parent-1",
        profileId: "player-jack",
        status: "active",
        source: "payment",
        paymentId: "pi_paid",
        stripeSubscriptionId: null,
        endDate: new Date(Date.now() + 90 * 86400_000).toISOString(),
        metadata: {},
      });

      // One was upgraded in place, the other cancelled — and at the end
      // there's exactly one Active row regardless of which was picked.
      expect([legacy.id, modern.id]).toContain(result.id);
      const losers = [legacy, modern].filter((r) => r.id !== result.id);
      for (const loser of losers) {
        const reloaded = enrollments.find((r) => r.id === loser.id)!;
        expect(reloaded.status).toBe("cancelled");
        expect((reloaded.metadata as any).cancelledReason).toBe(
          "duplicate_paid_enrollment_exists",
        );
      }
      const activeForPair = enrollments.filter(
        (r) =>
          r.profileId === "player-jack" && r.programId === "program-A" && r.status === "active",
      );
      expect(activeForPair).toHaveLength(1);
    });

    // The headline regression scenario from the task description: parent's
    // player got an admin_assignment auto-grant when they were rostered, then
    // the parent paid via Stripe checkout. After the webhook fires there must
    // be one Active row carrying the payment evidence — and zero leftover
    // unpaid duplicates regardless of how the original grant was created.
    it("end-to-end: team-assignment auto-grant + paid checkout = one Active row with payment evidence", async () => {
      // Step 1: admin assigns the player to a team — auto-grants an unpaid
      // admin_assignment enrollment with a pay-by date.
      const teamGrant = seedEnrollment({
        source: "admin_assignment",
        endDate: new Date(Date.now() + 14 * 86400_000).toISOString(),
        metadata: { autoGrantedOnAssignment: true, payByDate: "any" },
      });

      // Step 2: parent runs through Stripe checkout. The webhook calls
      // storage.createEnrollment with payment evidence.
      const storage = new DatabaseStorage();
      const result = await storage.createEnrollment({
        organizationId: "org-1",
        programId: "program-A",
        accountHolderId: "parent-1",
        profileId: "player-jack",
        status: "active",
        source: "payment",
        paymentId: "pi_paid_checkout",
        stripeSubscriptionId: "sub_paid_checkout",
        endDate: new Date(Date.now() + 365 * 86400_000).toISOString(),
        metadata: {},
      });

      // The original grant was upgraded in place (audit trail preserved).
      expect(result.id).toBe(teamGrant.id);
      expect(result.paymentId).toBe("pi_paid_checkout");
      expect(result.stripeSubscriptionId).toBe("sub_paid_checkout");

      // Single active row for the player+program, carrying payment evidence.
      const activeForPair = enrollments.filter(
        (r) =>
          r.profileId === "player-jack" && r.programId === "program-A" && r.status === "active",
      );
      expect(activeForPair).toHaveLength(1);
      expect(activeForPair[0].paymentId).toBe("pi_paid_checkout");
      expect(activeForPair[0].stripeSubscriptionId).toBe("sub_paid_checkout");
    });
  });
});
