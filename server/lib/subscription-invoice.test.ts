import { describe, it, expect, vi } from "vitest";
import { handleSubscriptionInvoice } from "./subscription-invoice";

function makeStorage(overrides: Partial<any> = {}) {
  const payments: any[] = overrides.initialPayments || [];
  const enrollments: any[] = overrides.initialEnrollments || [];
  const users: Record<string, any> = overrides.users || {};
  const programs: Record<string, any> = overrides.programs || {};
  let nextPaymentId = (overrides.nextPaymentId as number) || 100;
  let nextEnrollmentId = (overrides.nextEnrollmentId as number) || 200;

  return {
    payments,
    enrollments,
    getPaymentsByUser: vi.fn(async (userId: string) =>
      payments.filter((p) => p.userId === userId),
    ),
    getUser: vi.fn(async (id: string) => users[id]),
    getProgram: vi.fn(async (id: string) => programs[id]),
    createPayment: vi.fn(async (data: any) => {
      const row = { id: nextPaymentId++, ...data };
      payments.push(row);
      return row;
    }),
    getActiveEnrollmentsWithCredits: vi.fn(async (playerId: string) =>
      enrollments.filter(
        (e) => e.profileId === playerId && e.status === "active",
      ),
    ),
    createEnrollment: vi.fn(async (data: any) => {
      const row = { id: nextEnrollmentId++, ...data };
      enrollments.push(row);
      return row;
    }),
    updateEnrollment: vi.fn(async (id: number, updates: any) => {
      const e = enrollments.find((x) => x.id === id);
      if (!e) return undefined;
      Object.assign(e, updates);
      return e;
    }),
  } as any;
}

const baseInvoice = {
  id: "in_test_123",
  paid: true,
  status: "paid",
  amount_paid: 39368,
  currency: "usd",
  subscription: "sub_test_abc",
  payment_intent: "pi_test_xyz",
  metadata: {},
} as any;

describe("handleSubscriptionInvoice", () => {
  it("records a payment row with the stripe payment intent and a fresh enrollment", async () => {
    const storage = makeStorage({
      users: {
        "user-1": { id: "user-1", organizationId: "org-1", firstName: "Pat", lastName: "Parent" },
        "player-1": { id: "player-1", organizationId: "org-1", firstName: "Kid", lastName: "Player" },
      },
      programs: {
        "pkg-1": { id: "pkg-1", organizationId: "org-1", type: "Subscription", name: "Monthly Pass", sessionCount: 8 },
      },
    });
    const stripeMock = {
      subscriptions: {
        retrieve: vi.fn(async () => ({
          id: "sub_test_abc",
          metadata: {
            type: "package_purchase",
            userId: "user-1",
            packageId: "pkg-1",
            playerId: "player-1",
          },
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
        })),
      },
    } as any;

    const result = await handleSubscriptionInvoice(baseInvoice, { storage, stripe: stripeMock });

    expect(result.status).toBe("recorded");
    expect(storage.createPayment).toHaveBeenCalledTimes(1);
    const payArgs = storage.createPayment.mock.calls[0][0];
    expect(payArgs.stripePaymentId).toBe("pi_test_xyz");
    expect(payArgs.amount).toBe(39368);
    expect(payArgs.userId).toBe("user-1");
    expect(payArgs.playerId).toBe("player-1");
    expect(storage.createEnrollment).toHaveBeenCalledTimes(1);
    const enrollArgs = storage.createEnrollment.mock.calls[0][0];
    expect(enrollArgs.stripeSubscriptionId).toBe("sub_test_abc");
    expect(enrollArgs.status).toBe("active");
    expect(enrollArgs.programId).toBe("pkg-1");
  });

  it("dedupes when the checkout webhook already recorded the same payment intent", async () => {
    const storage = makeStorage({
      users: { "user-1": { id: "user-1", organizationId: "org-1" }, "player-1": { id: "player-1", organizationId: "org-1" } },
      programs: { "pkg-1": { id: "pkg-1", organizationId: "org-1", type: "Subscription", name: "Monthly Pass" } },
      initialPayments: [
        { id: 50, userId: "user-1", stripePaymentId: "pi_test_xyz", status: "completed", amount: 39368 },
      ],
    });
    const stripeMock = {
      subscriptions: {
        retrieve: vi.fn(async () => ({
          id: "sub_test_abc",
          metadata: { type: "package_purchase", userId: "user-1", packageId: "pkg-1", playerId: "player-1" },
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
        })),
      },
    } as any;

    const result = await handleSubscriptionInvoice(baseInvoice, { storage, stripe: stripeMock });

    expect(result.status).toBe("duplicate");
    expect(storage.createPayment).not.toHaveBeenCalled();
    expect(storage.createEnrollment).not.toHaveBeenCalled();
  });

  it("extends the existing enrollment for the same subscription on renewal", async () => {
    const oldEnd = new Date(Date.now() - 5 * 86400 * 1000).toISOString();
    const storage = makeStorage({
      users: { "user-1": { id: "user-1", organizationId: "org-1" }, "player-1": { id: "player-1", organizationId: "org-1" } },
      programs: { "pkg-1": { id: "pkg-1", organizationId: "org-1", type: "Subscription", name: "Monthly Pass" } },
      initialEnrollments: [
        {
          id: 999,
          profileId: "player-1",
          accountHolderId: "user-1",
          programId: "pkg-1",
          status: "active",
          source: "payment",
          stripeSubscriptionId: "sub_test_abc",
          paymentId: "50",
          endDate: oldEnd,
        },
      ],
    });
    const stripeMock = {
      subscriptions: {
        retrieve: vi.fn(async () => ({
          id: "sub_test_abc",
          metadata: { type: "package_purchase", userId: "user-1", packageId: "pkg-1", playerId: "player-1" },
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
        })),
      },
    } as any;
    const renewalInvoice = { ...baseInvoice, id: "in_renewal_2", payment_intent: "pi_renewal_2" };

    const result = await handleSubscriptionInvoice(renewalInvoice, { storage, stripe: stripeMock });

    expect(result.status).toBe("recorded");
    expect(storage.createPayment).toHaveBeenCalledTimes(1);
    expect(storage.createEnrollment).not.toHaveBeenCalled();
    expect(storage.updateEnrollment).toHaveBeenCalledTimes(1);
    const [enrollmentId, updates] = storage.updateEnrollment.mock.calls[0];
    expect(enrollmentId).toBe(999);
    expect(updates.status).toBe("active");
    expect(new Date(updates.endDate).getTime()).toBeGreaterThan(new Date(oldEnd).getTime());
  });

  it("falls back to invoice.id when no payment_intent is present on the invoice", async () => {
    const storage = makeStorage({
      users: { "user-1": { id: "user-1", organizationId: "org-1" }, "player-1": { id: "player-1", organizationId: "org-1" } },
      programs: { "pkg-1": { id: "pkg-1", organizationId: "org-1", type: "Subscription", name: "Monthly Pass" } },
    });
    const stripeMock = {
      subscriptions: {
        retrieve: vi.fn(async () => ({
          id: "sub_test_abc",
          metadata: { type: "package_purchase", userId: "user-1", packageId: "pkg-1", playerId: "player-1" },
        })),
      },
    } as any;
    const inv = { ...baseInvoice, payment_intent: null };

    const result = await handleSubscriptionInvoice(inv, { storage, stripe: stripeMock });

    expect(result.status).toBe("recorded");
    const payArgs = storage.createPayment.mock.calls[0][0];
    expect(payArgs.stripePaymentId).toBe("in_test_123");
  });

  it("skips when metadata cannot resolve a userId/packageId", async () => {
    const storage = makeStorage();
    const stripeMock = {
      subscriptions: { retrieve: vi.fn(async () => ({ id: "sub_test_abc", metadata: {} })) },
    } as any;
    const result = await handleSubscriptionInvoice(baseInvoice, { storage, stripe: stripeMock });
    expect(result.status).toBe("skipped");
    expect(storage.createPayment).not.toHaveBeenCalled();
  });
});
