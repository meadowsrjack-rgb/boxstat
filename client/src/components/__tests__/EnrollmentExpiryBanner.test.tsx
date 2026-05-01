import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { EnrollmentExpiryBanner } from "../EnrollmentExpiryBanner";

/**
 * Task #326 regression coverage. A player whose unified access status is
 * already `paid` (or `grace`) should not see either of the access banners,
 * even when a stale unpaid `admin_assignment` / `self_claim` enrollment row
 * is still on file for the same player. The bug being fixed: the
 * "no expiry on file" alert iterated per enrollment row and fired whenever
 * any active row had `endDate=null`, ignoring the fact that another paid
 * enrollment with a real end date already covered the same player.
 */

const FUTURE = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

interface Enrollment {
  id: number;
  programId: string;
  profileId: string | null;
  endDate: string | null;
  gracePeriodEndDate: string | null;
  status: string;
  source?: string | null;
  paymentId?: string | null;
  stripeSubscriptionId?: string | null;
}

interface Player {
  id: string;
  firstName: string;
  lastName: string;
}

function renderBanner(enrollments: Enrollment[], players: Player[]) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  // Pre-seed the cache so the component renders synchronously without
  // needing the network fetcher to run.
  client.setQueryData(["/api/enrollments"], enrollments);
  client.setQueryData(["/api/account/players"], players);
  return render(
    <QueryClientProvider client={client}>
      <EnrollmentExpiryBanner />
    </QueryClientProvider>,
  );
}

const PLAYER: Player = { id: "player-jack", firstName: "Jack", lastName: "Player" };

describe("EnrollmentExpiryBanner — Task #326 banner suppression", () => {
  afterEach(() => cleanup());

  it("hides BOTH access banners for a player who has paid access plus a stale unpaid duplicate", () => {
    const enrollments: Enrollment[] = [
      // Stale admin grant for the same player+program with no end date — the
      // exact row that used to trip both banners in the screenshot scenario.
      {
        id: 1,
        programId: "program-A",
        profileId: PLAYER.id,
        endDate: null,
        gracePeriodEndDate: null,
        status: "active",
        source: "admin_assignment",
        paymentId: null,
        stripeSubscriptionId: null,
      },
      // The paid enrollment that covers the same player+program.
      {
        id: 2,
        programId: "program-A",
        profileId: PLAYER.id,
        endDate: FUTURE,
        gracePeriodEndDate: null,
        status: "active",
        source: "payment",
        paymentId: "pi_paid",
        stripeSubscriptionId: null,
      },
    ];
    const { container } = renderBanner(enrollments, [PLAYER]);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId(`banner-access-${PLAYER.id}`)).toBeNull();
    expect(screen.queryByTestId(`banner-no-expiry-${PLAYER.id}`)).toBeNull();
  });

  it("hides the no-expiry banner for a paid player even when the unpaid duplicate is for a different program row", () => {
    // Same screenshot scenario, but with the unpaid grant on an unrelated
    // program. The unified per-player status is still "paid" overall, so
    // the no-expiry alert must NOT fire — it used to fire because it
    // iterated per enrollment row.
    const enrollments: Enrollment[] = [
      {
        id: 1,
        programId: "program-B",
        profileId: PLAYER.id,
        endDate: null,
        gracePeriodEndDate: null,
        status: "active",
        source: "admin_assignment",
        paymentId: null,
        stripeSubscriptionId: null,
      },
      {
        id: 2,
        programId: "program-A",
        profileId: PLAYER.id,
        endDate: FUTURE,
        gracePeriodEndDate: null,
        status: "active",
        source: "payment",
        paymentId: "pi_paid",
        stripeSubscriptionId: null,
      },
    ];
    renderBanner(enrollments, [PLAYER]);
    expect(screen.queryByTestId(`banner-no-expiry-${PLAYER.id}`)).toBeNull();
    expect(screen.queryByTestId(`banner-access-${PLAYER.id}`)).toBeNull();
  });

  it("still shows BOTH banners for a player who genuinely only has an unpaid admin grant", () => {
    const enrollments: Enrollment[] = [
      {
        id: 1,
        programId: "program-A",
        profileId: PLAYER.id,
        endDate: null,
        gracePeriodEndDate: null,
        status: "active",
        source: "admin_assignment",
        paymentId: null,
        stripeSubscriptionId: null,
      },
    ];
    renderBanner(enrollments, [PLAYER]);
    expect(screen.getByTestId(`banner-access-${PLAYER.id}`)).toBeInTheDocument();
    expect(screen.getByTestId(`banner-no-expiry-${PLAYER.id}`)).toBeInTheDocument();
  });

  // Jeremy Zhang regression: parent paid for the program, but the original
  // paid enrollment row got cancelled (refund flow / admin replaced it /
  // billing hiccup) and an admin courtesy grant was issued on top. The
  // unified status used to flip to "admin_grant" and the parent saw
  // "Access pending — pay to keep playing" PLUS the no-expiry nag, even
  // though the payment is on file.
  it("hides BOTH banners when the active enrollment is an admin grant on top of a CANCELLED paid enrollment", () => {
    const enrollments: Enrollment[] = [
      // The original paid Youth Club enrollment — got cancelled but the
      // payment is still attached.
      {
        id: 96,
        programId: "youth-club",
        profileId: PLAYER.id,
        endDate: null,
        gracePeriodEndDate: null,
        status: "cancelled",
        source: "direct",
        paymentId: "pi_paid",
        stripeSubscriptionId: null,
      },
      // Admin granted courtesy access a week later.
      {
        id: 120,
        programId: "youth-club",
        profileId: PLAYER.id,
        endDate: null,
        gracePeriodEndDate: null,
        status: "active",
        source: "admin",
        paymentId: null,
        stripeSubscriptionId: null,
      },
    ];
    renderBanner(enrollments, [PLAYER]);
    expect(screen.queryByTestId(`banner-access-${PLAYER.id}`)).toBeNull();
    expect(screen.queryByTestId(`banner-no-expiry-${PLAYER.id}`)).toBeNull();
  });

  // Locks in the .every(...) semantics in adminGrantCoveredByPaid:
  // suppression only fires when EVERY active admin grant has a paid sibling
  // for the same program. If even one grant is uncovered, the banner must
  // still show.
  it("STILL shows the access banner when one admin grant is covered by a paid sibling but a second admin grant is not", () => {
    const enrollments: Enrollment[] = [
      // Paid sibling for program A.
      {
        id: 1,
        programId: "program-A",
        profileId: PLAYER.id,
        endDate: null,
        gracePeriodEndDate: null,
        status: "cancelled",
        source: "direct",
        paymentId: "pi_paid_A",
        stripeSubscriptionId: null,
      },
      // Admin grant for program A — covered by the paid sibling above.
      {
        id: 2,
        programId: "program-A",
        profileId: PLAYER.id,
        endDate: null,
        gracePeriodEndDate: null,
        status: "active",
        source: "admin",
        paymentId: null,
        stripeSubscriptionId: null,
      },
      // Genuine uncovered admin grant for program C — should still nag.
      {
        id: 3,
        programId: "program-C",
        profileId: PLAYER.id,
        endDate: null,
        gracePeriodEndDate: null,
        status: "active",
        source: "admin",
        paymentId: null,
        stripeSubscriptionId: null,
      },
    ];
    renderBanner(enrollments, [PLAYER]);
    expect(screen.getByTestId(`banner-access-${PLAYER.id}`)).toBeInTheDocument();
  });

  // Architect-requested false-positive guard. Paid history for one program
  // must NOT silence a genuine unpaid admin grant for a different program.
  // Otherwise a parent who paid for program A would never see the "pay to
  // keep playing" banner for the unrelated program B their kid is on.
  it("STILL shows the access banner for an admin grant whose program has no paid sibling, even if the player paid for an UNRELATED program", () => {
    const enrollments: Enrollment[] = [
      // Paid for program A.
      {
        id: 1,
        programId: "program-A",
        profileId: PLAYER.id,
        endDate: null,
        gracePeriodEndDate: null,
        status: "cancelled",
        source: "direct",
        paymentId: "pi_paid_A",
        stripeSubscriptionId: null,
      },
      // Genuine unpaid admin grant for program B — must still nag.
      {
        id: 2,
        programId: "program-B",
        profileId: PLAYER.id,
        endDate: null,
        gracePeriodEndDate: null,
        status: "active",
        source: "admin",
        paymentId: null,
        stripeSubscriptionId: null,
      },
    ];
    renderBanner(enrollments, [PLAYER]);
    expect(screen.getByTestId(`banner-access-${PLAYER.id}`)).toBeInTheDocument();
    expect(screen.getByTestId(`banner-no-expiry-${PLAYER.id}`)).toBeInTheDocument();
  });
});
