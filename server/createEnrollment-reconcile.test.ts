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
          } else {
            acc[k] = v;
          }
        }
        return acc;
      }, {}),
    }),
    or: (...conds: PendingFilter[]) => ({
      filter: conds.reduce<Record<string, unknown>>((acc, c) => ({ ...acc, ...c.filter }), {}),
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
});
