import { describe, it, expect } from "vitest";
import {
  findDuplicatesToCancel,
  type DuplicateScanRow,
} from "./backfillDuplicateEnrollments";

const baseRow: DuplicateScanRow = {
  id: 0,
  profileId: "player-1",
  programId: "program-A",
  status: "active",
  source: "admin_assignment",
  paymentId: null,
  stripeSubscriptionId: null,
};

describe("Task #326 — findDuplicatesToCancel", () => {
  it("cancels an unpaid admin_assignment row when a paid row exists for the same player+program", () => {
    const result = findDuplicatesToCancel([
      { ...baseRow, id: 1, source: "admin_assignment", paymentId: null },
      { ...baseRow, id: 2, source: "payment", paymentId: "pi_123" },
    ]);
    expect(result).toEqual([{ cancelId: 1, keepId: 2 }]);
  });

  it("cancels an unpaid self_claim row when a subscription-backed row exists for the same player+program", () => {
    const result = findDuplicatesToCancel([
      { ...baseRow, id: 5, source: "self_claim" },
      { ...baseRow, id: 6, source: "payment", stripeSubscriptionId: "sub_xyz" },
    ]);
    expect(result).toEqual([{ cancelId: 5, keepId: 6 }]);
  });

  it("does not cancel anything when only an unpaid grant exists", () => {
    const result = findDuplicatesToCancel([
      { ...baseRow, id: 1, source: "admin_assignment" },
    ]);
    expect(result).toEqual([]);
  });

  it("does not cancel rows for a different player or program", () => {
    const result = findDuplicatesToCancel([
      { ...baseRow, id: 1, source: "admin_assignment" },
      { ...baseRow, id: 2, profileId: "player-2", source: "payment", paymentId: "pi_a" },
      { ...baseRow, id: 3, programId: "program-B", source: "payment", paymentId: "pi_b" },
    ]);
    expect(result).toEqual([]);
  });

  it("ignores cancelled / non-active rows", () => {
    const result = findDuplicatesToCancel([
      { ...baseRow, id: 1, source: "admin_assignment", status: "cancelled" },
      { ...baseRow, id: 2, source: "payment", paymentId: "pi_123" },
    ]);
    expect(result).toEqual([]);
  });

  it("does not touch two paid rows for the same player+program", () => {
    const result = findDuplicatesToCancel([
      { ...baseRow, id: 1, source: "payment", paymentId: "pi_old" },
      { ...baseRow, id: 2, source: "payment", paymentId: "pi_new" },
    ]);
    expect(result).toEqual([]);
  });

  it("cancels every unpaid duplicate when several stack up for one player+program", () => {
    const result = findDuplicatesToCancel([
      { ...baseRow, id: 1, source: "admin_assignment" },
      { ...baseRow, id: 2, source: "self_claim" },
      { ...baseRow, id: 3, source: "payment", paymentId: "pi_paid" },
    ]);
    expect(result).toEqual([
      { cancelId: 1, keepId: 3 },
      { cancelId: 2, keepId: 3 },
    ]);
  });

  it("ignores rows missing profileId or programId", () => {
    const result = findDuplicatesToCancel([
      { ...baseRow, id: 1, profileId: null },
      { ...baseRow, id: 2, programId: null },
      { ...baseRow, id: 3, source: "payment", paymentId: "pi_paid" },
    ]);
    expect(result).toEqual([]);
  });

  // Task #332: Source is no longer a gate. Any unpaid active row should be
  // collapsed when a paid row exists, regardless of how it was created.
  it.each([
    ["admin"],
    ["direct"],
    ["migration"],
    ["import"],
    ["payment"], // legacy 'payment' source row whose payment row never landed
    ["quote"],
    ["tryout_upgrade"],
    [null],
  ])("cancels unpaid duplicate with source=%s when a paid row exists (Task #332)", (src) => {
    const result = findDuplicatesToCancel([
      { ...baseRow, id: 11, source: src as string | null, paymentId: null, stripeSubscriptionId: null },
      { ...baseRow, id: 12, source: "payment", paymentId: "pi_paid" },
    ]);
    expect(result).toEqual([{ cancelId: 11, keepId: 12 }]);
  });

  it("collapses a legacy unpaid leftover whose isTryout column is NULL (Task #332)", () => {
    // isTryout is nullable in the schema; legacy rows can have NULL.
    // The JS-side check `if (row.isTryout) continue;` correctly treats
    // NULL as not-a-tryout, so the row is eligible for collapse.
    const result = findDuplicatesToCancel([
      { ...baseRow, id: 41, source: "admin", paymentId: null, stripeSubscriptionId: null, isTryout: null as any },
      { ...baseRow, id: 42, source: "payment", paymentId: "pi_paid", isTryout: false },
    ]);
    expect(result).toEqual([{ cancelId: 41, keepId: 42 }]);
  });

  it("preserves tryout enrollments — a paid full-program row does NOT collapse a tryout credit (Task #332)", () => {
    const result = findDuplicatesToCancel([
      { ...baseRow, id: 21, source: "payment", paymentId: null, stripeSubscriptionId: null, isTryout: true },
      { ...baseRow, id: 22, source: "payment", paymentId: "pi_paid", isTryout: false },
    ]);
    expect(result).toEqual([]);
  });

  it("keeps the most recent paid row when several paid rows coexist (Task #332)", () => {
    const result = findDuplicatesToCancel([
      { ...baseRow, id: 31, source: "admin_assignment" },
      { ...baseRow, id: 32, source: "payment", paymentId: "pi_old" },
      { ...baseRow, id: 33, source: "payment", paymentId: "pi_new" },
    ]);
    // Older paid row (id=32) is left alone; only the unpaid leftover collapses
    // and it points at the most recent paid row.
    expect(result).toEqual([{ cancelId: 31, keepId: 33 }]);
  });
});
