import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import MyPurchasesCard, { type PurchaseStatus } from "../MyPurchasesCard";

/**
 * Task #348 regression coverage. Task #345 added the
 * "Expires/Renews/Expired {date}" line under each program's status badge in
 * the My Purchases card. None of the wording branches were covered by an
 * automated test, so a future refactor of MyPurchasesCard.tsx could silently
 * regress what parents now rely on. These tests lock in:
 *  - active one-time enrollment with expiresAt -> "Expires ..."
 *  - active Subscription with expiresAt        -> "Renews ..."
 *  - expired enrollment                        -> "Expired ..."
 *  - active enrollment with no expiresAt       -> badge only, no expiry line
 * Each assertion targets the `text-program-expiry-${id}` test id.
 */

const ISO_DATE = "2026-06-12T00:00:00.000Z";
const FORMATTED_DATE = new Date(ISO_DATE).toLocaleDateString(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
});

type Program = {
  id: string;
  name: string;
  type?: string;
  productCategory?: string;
  isActive?: boolean;
};

const PROGRAMS: Program[] = [
  {
    id: "prog-onetime",
    name: "One-Time Clinic",
    type: "One-Time",
    productCategory: "service",
    isActive: true,
  },
  {
    id: "prog-sub",
    name: "Monthly Membership",
    type: "Subscription",
    productCategory: "service",
    isActive: true,
  },
  {
    id: "prog-expired",
    name: "Expired Camp",
    type: "One-Time",
    productCategory: "service",
    isActive: true,
  },
  {
    id: "prog-no-date",
    name: "Open-Ended Program",
    type: "One-Time",
    productCategory: "service",
    isActive: true,
  },
];

const PURCHASES: PurchaseStatus[] = [
  { productId: "prog-onetime", status: "active", expiresAt: ISO_DATE },
  { productId: "prog-sub", status: "active", expiresAt: ISO_DATE },
  { productId: "prog-expired", status: "expired", expiresAt: ISO_DATE },
  { productId: "prog-no-date", status: "active" },
];

function renderCard() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: Infinity },
    },
  });
  // Pre-seed the cache so the component renders synchronously without
  // hitting the network. `staleTime: Infinity` keeps React Query from
  // triggering a background refetch of the seeded keys during the test.
  // Keys must match those in MyPurchasesCard when no orgId prop is passed.
  client.setQueryData(["/api/programs"], PROGRAMS);
  client.setQueryData(["my-purchases"], PURCHASES);
  return render(
    <QueryClientProvider client={client}>
      <MyPurchasesCard />
    </QueryClientProvider>,
  );
}

describe("MyPurchasesCard expiry line wording (Task #345 regression)", () => {
  afterEach(() => cleanup());

  it("shows 'Expires {date}' for an active one-time enrollment with expiresAt", () => {
    renderCard();
    const line = screen.getByTestId("text-program-expiry-prog-onetime");
    expect(line).toHaveTextContent(`Expires ${FORMATTED_DATE}`);
  });

  it("shows 'Renews {date}' for an active Subscription with expiresAt", () => {
    renderCard();
    const line = screen.getByTestId("text-program-expiry-prog-sub");
    expect(line).toHaveTextContent(`Renews ${FORMATTED_DATE}`);
  });

  it("shows 'Expired {date}' for an expired enrollment", () => {
    renderCard();
    const line = screen.getByTestId("text-program-expiry-prog-expired");
    expect(line).toHaveTextContent(`Expired ${FORMATTED_DATE}`);
  });

  it("renders the status badge but no expiry line when expiresAt is missing", () => {
    renderCard();
    expect(
      screen.getByTestId("badge-program-status-prog-no-date"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("text-program-expiry-prog-no-date"),
    ).toBeNull();
  });
});
