import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Task #346 — integration coverage for `GET /api/purchases/me`.
 *
 * Locks in the org-scoping rule and best-status-wins grouping introduced
 * in Task #343 so future refactors of the org guard or enrollment status
 * mapping cannot quietly bleed purchases across clubs again.
 *
 * Mocks the `./db` and `./storage` modules with small in-memory shims so
 * the handler runs end-to-end without needing a Postgres pool.
 */

interface EnrollmentRow {
  organizationId: string;
  accountHolderId: string;
  programId: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  gracePeriodEndDate: string | null;
  createdAt: string | null;
}

interface UserRow {
  id: string;
  email: string;
  role: string;
  organizationId: string;
  accountHolderId: string | null;
  parentId?: string | null;
  guardianId?: string | null;
}

const enrollments: EnrollmentRow[] = [];
const users: UserRow[] = [];

const snakeToCamel = (s: string) =>
  s.replace(/_([a-z])/g, (_m, ch: string) => ch.toUpperCase());

const fieldName = (col: any): string => {
  if (typeof col === "string") return col;
  if (col && typeof col === "object" && "name" in col) return String(col.name);
  return "";
};

interface FilterDescriptor {
  filter: Record<string, unknown>;
}

const matches = (row: any, filter: Record<string, unknown>): boolean => {
  for (const [k, v] of Object.entries(filter)) {
    if (k === "_ands") {
      const ands = v as Record<string, unknown>[];
      if (!ands.every((f) => matches(row, f))) return false;
      continue;
    }
    const camel = snakeToCamel(k);
    if (row[camel] !== v) return false;
  }
  return true;
};

vi.mock("./db", () => {
  return {
    db: {
      select: (_projection?: any) => ({
        from: (_table: any) => ({
          where: (cond: FilterDescriptor) => {
            const filtered = enrollments.filter((r) => matches(r, cond.filter));
            return Promise.resolve(filtered.map((r) => ({ ...r })));
          },
        }),
      }),
    },
    pool: {},
  };
});

vi.mock("./storage", () => {
  return {
    storage: {
      getUser: async (id: string) => users.find((u) => u.id === id),
      getUsersByOrganization: async (orgId: string) =>
        users.filter((u) => u.organizationId === orgId),
      getPlayersByParent: async (parentId: string) => {
        const seed = users.find((u) => u.id === parentId);
        const root = seed?.accountHolderId || parentId;
        return users.filter(
          (u) =>
            u.role === "player" &&
            (u.parentId === parentId ||
              u.accountHolderId === parentId ||
              u.guardianId === parentId ||
              u.accountHolderId === root),
        );
      },
    },
  };
});

vi.mock("drizzle-orm", async () => {
  const actual = await vi.importActual<any>("drizzle-orm");
  return {
    ...actual,
    eq: (col: any, value: unknown) => ({ filter: { [fieldName(col)]: value } }),
    and: (...conds: FilterDescriptor[]) => ({
      filter: {
        _ands: conds.filter(Boolean).map((c) => c.filter),
      },
    }),
  };
});

let purchasesMeHandler: typeof import("./routes/purchases-me").purchasesMeHandler;

beforeEach(async () => {
  enrollments.length = 0;
  users.length = 0;
  if (!purchasesMeHandler) {
    const mod = await import("./routes/purchases-me");
    purchasesMeHandler = mod.purchasesMeHandler;
  }
});

const seedUser = (over: Partial<UserRow> & { id: string }): UserRow => {
  const u: UserRow = {
    email: `${over.id}@example.com`,
    role: "parent",
    organizationId: "org-A",
    accountHolderId: null,
    parentId: null,
    guardianId: null,
    ...over,
  };
  users.push(u);
  return u;
};

const seedEnrollment = (over: Partial<EnrollmentRow>): EnrollmentRow => {
  const row: EnrollmentRow = {
    organizationId: "org-A",
    accountHolderId: "parent-1",
    programId: "prog-A",
    status: "active",
    startDate: "2026-01-01T00:00:00.000Z",
    endDate: "2026-12-31T00:00:00.000Z",
    gracePeriodEndDate: null,
    createdAt: "2025-12-01T00:00:00.000Z",
    ...over,
  };
  enrollments.push(row);
  return row;
};

interface FakeRes {
  statusCode: number;
  body: any;
  status(code: number): FakeRes;
  json(payload: any): FakeRes;
}

const makeRes = (): FakeRes => {
  const res: FakeRes = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
  };
  return res;
};

const callHandler = async (
  user: { id: string; organizationId: string; role?: string },
  query: Record<string, string> = {},
) => {
  const req = { user, query } as any;
  const res = makeRes();
  await purchasesMeHandler(req as any, res as any);
  return res;
};

describe("Task #346 — GET /api/purchases/me", () => {
  it("returns every household enrollment when no organizationId is supplied", async () => {
    seedUser({ id: "parent-1", organizationId: "org-A" });
    seedEnrollment({
      accountHolderId: "parent-1",
      organizationId: "org-A",
      programId: "prog-A",
      status: "active",
    });
    seedEnrollment({
      accountHolderId: "parent-1",
      organizationId: "org-B",
      programId: "prog-B",
      status: "pending",
    });

    const res = await callHandler({ id: "parent-1", organizationId: "org-A" });

    expect(res.statusCode).toBe(200);
    const byProduct = Object.fromEntries(
      (res.body as any[]).map((p) => [p.productId, p]),
    );
    expect(byProduct["prog-A"].status).toBe("active");
    expect(byProduct["prog-B"].status).toBe("pending");
    expect(Object.keys(byProduct)).toHaveLength(2);
  });

  it("collapses to the account-holder root so a parent signed in under any child profile sees every household enrollment", async () => {
    // Parent signed in under their own household child profile (not the
    // root account-holder). The handler should resolve up to the root and
    // surface enrollments owned by the root account holder.
    seedUser({
      id: "child-profile-1",
      organizationId: "org-A",
      accountHolderId: "parent-root",
      role: "player",
    });
    seedUser({ id: "parent-root", organizationId: "org-A" });

    seedEnrollment({
      accountHolderId: "parent-root",
      organizationId: "org-A",
      programId: "prog-fall",
      status: "active",
    });
    // Enrollment owned by the child profile directly should NOT show up,
    // because the route scopes to the root account holder.
    seedEnrollment({
      accountHolderId: "child-profile-1",
      organizationId: "org-A",
      programId: "prog-other",
      status: "active",
    });

    const res = await callHandler({
      id: "child-profile-1",
      organizationId: "org-A",
    });

    expect(res.statusCode).toBe(200);
    const ids = (res.body as any[]).map((p) => p.productId);
    expect(ids).toContain("prog-fall");
    expect(ids).not.toContain("prog-other");
  });

  it("scopes to the requested org when the parent has a linked player there", async () => {
    seedUser({ id: "parent-1", organizationId: "org-A" });
    // Player linked at org-B via accountHolderId.
    seedUser({
      id: "player-at-orgB",
      organizationId: "org-B",
      accountHolderId: "parent-1",
      role: "player",
    });

    seedEnrollment({
      accountHolderId: "parent-1",
      organizationId: "org-A",
      programId: "prog-A",
      status: "active",
    });
    seedEnrollment({
      accountHolderId: "parent-1",
      organizationId: "org-B",
      programId: "prog-B",
      status: "active",
    });

    const res = await callHandler(
      { id: "parent-1", organizationId: "org-A" },
      { organizationId: "org-B" },
    );

    expect(res.statusCode).toBe(200);
    const ids = (res.body as any[]).map((p) => p.productId);
    expect(ids).toEqual(["prog-B"]);
  });

  it("returns 403 when the requested org is not the session org and the user has no link there", async () => {
    seedUser({ id: "parent-1", organizationId: "org-A" });
    // Parent has a player linked at org-A only — NOT org-C.
    seedUser({
      id: "player-orgA",
      organizationId: "org-A",
      accountHolderId: "parent-1",
      role: "player",
    });

    seedEnrollment({
      accountHolderId: "parent-1",
      organizationId: "org-C",
      programId: "prog-leak",
      status: "active",
    });

    const res = await callHandler(
      { id: "parent-1", organizationId: "org-A" },
      { organizationId: "org-C" },
    );

    expect(res.statusCode).toBe(403);
    expect(res.body).toMatchObject({
      message: expect.stringMatching(/access/i),
    });
  });

  it("collapses multiple enrollment rows for the same product using best-status-wins (active > pending > expired)", async () => {
    seedUser({ id: "parent-1", organizationId: "org-A" });

    // Three rows for the same program: expired, pending, and active.
    // The handler should report only ONE entry, with status 'active'.
    seedEnrollment({
      accountHolderId: "parent-1",
      organizationId: "org-A",
      programId: "prog-multi",
      status: "expired",
      startDate: "2025-01-01T00:00:00.000Z",
      endDate: "2025-06-01T00:00:00.000Z",
    });
    seedEnrollment({
      accountHolderId: "parent-1",
      organizationId: "org-A",
      programId: "prog-multi",
      status: "pending",
      startDate: "2025-09-01T00:00:00.000Z",
      endDate: null,
    });
    seedEnrollment({
      accountHolderId: "parent-1",
      organizationId: "org-A",
      programId: "prog-multi",
      status: "active",
      startDate: "2026-01-01T00:00:00.000Z",
      endDate: "2026-12-31T00:00:00.000Z",
    });

    const res = await callHandler({ id: "parent-1", organizationId: "org-A" });

    expect(res.statusCode).toBe(200);
    const list = res.body as any[];
    expect(list).toHaveLength(1);
    expect(list[0].productId).toBe("prog-multi");
    expect(list[0].status).toBe("active");
  });

  it("treats grace_period as active and demotes cancelled to expired when ranking", async () => {
    seedUser({ id: "parent-1", organizationId: "org-A" });

    seedEnrollment({
      accountHolderId: "parent-1",
      organizationId: "org-A",
      programId: "prog-grace",
      status: "cancelled",
    });
    seedEnrollment({
      accountHolderId: "parent-1",
      organizationId: "org-A",
      programId: "prog-grace",
      status: "grace_period",
      gracePeriodEndDate: "2026-08-01T00:00:00.000Z",
    });

    const res = await callHandler({ id: "parent-1", organizationId: "org-A" });

    expect(res.statusCode).toBe(200);
    const row = (res.body as any[]).find((p) => p.productId === "prog-grace");
    expect(row.status).toBe("active");
  });
});
