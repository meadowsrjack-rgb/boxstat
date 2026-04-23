import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

import { AccessUntilLine } from "../AccessUntilLine";
import {
  SOURCE_LABELS,
  type AccessReason,
  type AccessStatus,
} from "@shared/access-status";

const ISO_DATE = "2026-05-15T00:00:00.000Z";
const FORMATTED_DATE = new Date(ISO_DATE).toLocaleDateString(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function statusFor(reason: AccessReason, accessUntil: string | null): AccessStatus {
  return { accessUntil, reason, sourceLabel: SOURCE_LABELS[reason] };
}

function renderLine(status: AccessStatus | null) {
  return render(<AccessUntilLine status={status} showTooltip={false} />);
}

describe("AccessUntilLine wording stays in sync across surfaces", () => {
  afterEach(() => cleanup());

  it("renders nothing when status is null", () => {
    const { container } = renderLine(null);
    expect(container).toBeEmptyDOMElement();
  });

  it("paid with end date", () => {
    renderLine(statusFor("paid", ISO_DATE));
    expect(screen.getByTestId("access-until-line")).toHaveTextContent(
      `Active until ${FORMATTED_DATE} — paid subscription`,
    );
  });

  it("paid without end date", () => {
    renderLine(statusFor("paid", null));
    expect(screen.getByTestId("access-until-line")).toHaveTextContent(
      "Active — paid subscription",
    );
  });

  it("admin_grant with end date", () => {
    renderLine(statusFor("admin_grant", ISO_DATE));
    expect(screen.getByTestId("access-until-line")).toHaveTextContent(
      `Access until ${FORMATTED_DATE} — pay by this date to keep playing`,
    );
  });

  it("admin_grant without end date", () => {
    renderLine(statusFor("admin_grant", null));
    expect(screen.getByTestId("access-until-line")).toHaveTextContent(
      "Access pending — pay to keep playing",
    );
  });

  it("grace with end date", () => {
    renderLine(statusFor("grace", ISO_DATE));
    expect(screen.getByTestId("access-until-line")).toHaveTextContent(
      `In grace period until ${FORMATTED_DATE} — payment overdue`,
    );
  });

  it("grace without end date", () => {
    renderLine(statusFor("grace", null));
    expect(screen.getByTestId("access-until-line")).toHaveTextContent(
      "In grace period — payment overdue",
    );
  });

  it("expired with end date", () => {
    renderLine(statusFor("expired", ISO_DATE));
    expect(screen.getByTestId("access-until-line")).toHaveTextContent(
      `Access ended ${FORMATTED_DATE}`,
    );
  });

  it("expired without end date", () => {
    renderLine(statusFor("expired", null));
    expect(screen.getByTestId("access-until-line")).toHaveTextContent(
      "Access ended",
    );
  });

  it("none renders the no-enrollment line", () => {
    renderLine(statusFor("none", null));
    expect(screen.getByTestId("access-until-line")).toHaveTextContent(
      "No active enrollment",
    );
  });

  it("invalid date string falls back to date-less wording", () => {
    renderLine({
      accessUntil: "not-a-real-date",
      reason: "paid",
      sourceLabel: SOURCE_LABELS.paid,
    });
    expect(screen.getByTestId("access-until-line")).toHaveTextContent(
      "Active — paid subscription",
    );
  });
});

describe("AccessUntilLine canonical source-label wording", () => {
  it.each<[AccessReason, string]>([
    ["paid", "Source: paid Stripe subscription or one-time payment."],
    ["admin_grant", "Source: admin-granted trial — pay by this date to keep access."],
    ["grace", "Source: grace period after a missed payment."],
    ["expired", "Source: enrollment ended without renewal."],
    ["none", "No active enrollment on file."],
  ])("locks the canonical source label for %s", (reason, expected) => {
    expect(SOURCE_LABELS[reason]).toBe(expected);
  });
});

describe("AccessUntilLine renders the source label inside the tooltip", () => {
  afterEach(() => cleanup());

  const reasons: AccessReason[] = ["paid", "admin_grant", "grace", "expired", "none"];

  it.each(reasons)("shows the source label tooltip for %s on hover", async (reason) => {
    render(
      <AccessUntilLine
        status={statusFor(reason, reason === "none" ? null : ISO_DATE)}
        showTooltip={true}
      />,
    );
    const trigger = screen.getByTestId("access-until-line");
    fireEvent.pointerEnter(trigger);
    fireEvent.mouseEnter(trigger);
    fireEvent.focus(trigger);
    await waitFor(() => {
      const matches = screen.getAllByText(SOURCE_LABELS[reason]);
      expect(matches.length).toBeGreaterThan(0);
    });
  });
});
