import { describe, it, expect } from "vitest";
import { parsePaste, normalizeDate, parseCsvRow } from "./pasteParser";

const HEADER = "First Name\tLast Name\tEmail\tParent Email\tSub End Date\tProgram\tTeam";

describe("normalizeDate", () => {
  it("passes through YYYY-MM-DD", () => {
    expect(normalizeDate("2026-04-20")).toBe("2026-04-20");
  });
  it("converts YYYY/MM/DD", () => {
    expect(normalizeDate("2026/04/20")).toBe("2026-04-20");
  });
  it("converts MM/DD/YYYY", () => {
    expect(normalizeDate("04/20/2026")).toBe("2026-04-20");
  });
  it("converts M/D/YYYY", () => {
    expect(normalizeDate("4/2/2026")).toBe("2026-04-02");
  });
  it("converts MM-DD-YYYY", () => {
    expect(normalizeDate("04-20-2026")).toBe("2026-04-20");
  });
  it("returns blank for empty", () => {
    expect(normalizeDate("")).toBe("");
    expect(normalizeDate("   ")).toBe("");
  });
  it("returns blank for unrecognized formats rather than guessing", () => {
    expect(normalizeDate("April 20, 2026")).toBe("");
    expect(normalizeDate("20/04/2026")).toBe(""); // invalid month 20 in US-style
    expect(normalizeDate("not a date")).toBe("");
    expect(normalizeDate("13/40/2026")).toBe("");
  });
});

describe("parseCsvRow", () => {
  it("preserves trailing empty cells", () => {
    expect(parseCsvRow("a\tb\t", "\t")).toEqual(["a", "b", ""]);
  });
  it("handles quoted last cell", () => {
    expect(parseCsvRow('a\tb\t"hello world"', "\t")).toEqual(["a", "b", "hello world"]);
  });
});

describe("parsePaste", () => {
  it("imports every row including the rightmost cell of the last row (CRLF, trailing newline)", () => {
    const raw =
      HEADER + "\r\n" +
      "Ava\tStone\ta@x.com\tp@x.com\t04/20/2026\tU10\tBlue\r\n" +
      "Ben\tLast\tb@x.com\tp@x.com\t04/21/2026\tU12\tRed\r\n";
    const rows = parsePaste(raw);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({
      first: "Ben", last: "Last", program: "U12", team: "Red",
      expiry: "2026-04-21",
    });
  });

  it("imports last row when there is NO trailing newline", () => {
    const raw =
      HEADER + "\n" +
      "Ava\tStone\ta@x.com\tp@x.com\t04/20/2026\tU10\tBlue\n" +
      "Ben\tLast\tb@x.com\tp@x.com\t04/21/2026\tU12\tRed";
    const rows = parsePaste(raw);
    expect(rows).toHaveLength(2);
    expect(rows[1].team).toBe("Red");
    expect(rows[1].program).toBe("U12");
  });

  it("preserves last row's trailing empty cell (short row padded)", () => {
    const raw =
      HEADER + "\n" +
      "Ava\tStone\ta@x.com\tp@x.com\t04/20/2026\tU10\tBlue\n" +
      "Ben\tLast\tb@x.com\tp@x.com\t04/21/2026\tU12\t";
    const rows = parsePaste(raw);
    expect(rows).toHaveLength(2);
    expect(rows[1].program).toBe("U12");
    expect(rows[1].team).toBe("");
  });

  it("handles mixed line endings (\\r, \\r\\n, \\n)", () => {
    const raw =
      HEADER + "\r\n" +
      "Ava\tStone\ta@x.com\tp@x.com\t04/20/2026\tU10\tBlue\r" +
      "Ben\tLast\tb@x.com\tp@x.com\t04/21/2026\tU12\tRed\n" +
      "Cam\tLast\tc@x.com\tp@x.com\t04/22/2026\tU14\tGreen";
    const rows = parsePaste(raw);
    expect(rows).toHaveLength(3);
    expect(rows[0].team).toBe("Blue");
    expect(rows[1].team).toBe("Red");
    expect(rows[2].team).toBe("Green");
  });

  it("handles a quoted last cell on the last row", () => {
    const raw =
      HEADER + "\n" +
      'Ava\tStone\ta@x.com\tp@x.com\t04/20/2026\tU10\t"Blue, A"';
    const rows = parsePaste(raw);
    expect(rows).toHaveLength(1);
    expect(rows[0].team).toBe("Blue, A");
  });

  it("normalizes Sub end dates from common formats", () => {
    const raw =
      HEADER + "\n" +
      "A\tA\ta@x.com\tp@x.com\t04/20/2026\tP\tT\n" +
      "B\tB\tb@x.com\tp@x.com\t4/2/2026\tP\tT\n" +
      "C\tC\tc@x.com\tp@x.com\t2026-04-20\tP\tT\n" +
      "D\tD\td@x.com\tp@x.com\t04-20-2026\tP\tT\n" +
      "E\tE\te@x.com\tp@x.com\tnot a date\tP\tT";
    const rows = parsePaste(raw);
    expect(rows.map((r) => r.expiry)).toEqual([
      "2026-04-20",
      "2026-04-02",
      "2026-04-20",
      "2026-04-20",
      "",
    ]);
  });

  it("supports comma-separated paste", () => {
    const raw =
      "First Name,Last Name,Email,Parent Email,Sub End Date,Program,Team\n" +
      "Ava,Stone,a@x.com,p@x.com,04/20/2026,U10,Blue";
    const rows = parsePaste(raw);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ first: "Ava", team: "Blue", expiry: "2026-04-20" });
  });
});
