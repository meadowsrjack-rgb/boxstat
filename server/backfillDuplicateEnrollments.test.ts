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

  it("does not touch a non-admin/self_claim duplicate (e.g. another paid row)", () => {
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
});
