import { describe, it, expect } from "vitest";
import {
  normalizeTitleKey,
  buildDedupIdentity,
  buildPushDedupKey,
} from "./notificationDedup";

describe("normalizeTitleKey", () => {
  it("returns empty string for null/undefined/empty", () => {
    expect(normalizeTitleKey(null)).toBe("");
    expect(normalizeTitleKey(undefined)).toBe("");
    expect(normalizeTitleKey("")).toBe("");
  });

  it("treats case-only differences as equal", () => {
    expect(normalizeTitleKey("12u Gray Practice")).toBe(
      normalizeTitleKey("12U Gray Practice"),
    );
    expect(normalizeTitleKey("12u Gray Practice")).toBe("12u gray practice");
  });

  it("collapses whitespace and trims", () => {
    expect(normalizeTitleKey("  12U   Gray\tPractice\n")).toBe(
      "12u gray practice",
    );
    expect(normalizeTitleKey("12U Gray Practice")).toBe(
      normalizeTitleKey("12U  Gray  Practice"),
    );
  });

  it("keeps genuinely different titles distinct", () => {
    expect(normalizeTitleKey("12U Gray Practice")).not.toBe(
      normalizeTitleKey("12U Blue Practice"),
    );
  });
});

describe("buildDedupIdentity", () => {
  it("uses event id when available", () => {
    expect(buildDedupIdentity(42, "Anything")).toBe("event-42");
    expect(buildDedupIdentity("abc", "Anything")).toBe("event-abc");
  });

  it("falls back to normalized title when no event id", () => {
    expect(buildDedupIdentity(null, "12U Gray Practice")).toBe(
      "title-12u gray practice",
    );
    expect(buildDedupIdentity(undefined, "  12U   Gray   Practice  ")).toBe(
      "title-12u gray practice",
    );
    expect(buildDedupIdentity(0, "Title Here")).toBe("title-title here");
  });
});

describe("buildPushDedupKey", () => {
  it("merges protocol, device, type, and identity", () => {
    const k = buildPushDedupKey("ios", "tok123", "event_rsvp_closing", "event-1");
    expect(k).toBe("ios:tok123:event_rsvp_closing:event-1");
  });

  it("namespaces by protocol so same device cannot collide", () => {
    expect(
      buildPushDedupKey("ios", "abc", "event_rsvp_closing", "event-1"),
    ).not.toBe(
      buildPushDedupKey("android", "abc", "event_rsvp_closing", "event-1"),
    );
  });

  it("differentiates by notification type", () => {
    expect(
      buildPushDedupKey("web", "endpoint", "event_rsvp_closing", "event-1"),
    ).not.toBe(
      buildPushDedupKey("web", "endpoint", "event_reminder", "event-1"),
    );
  });

  it("treats near-duplicate titles as the same key when no event id", () => {
    const a = buildPushDedupKey(
      "ios",
      "tok",
      "event_rsvp_closing",
      buildDedupIdentity(null, "12u Gray Practice"),
    );
    const b = buildPushDedupKey(
      "ios",
      "tok",
      "event_rsvp_closing",
      buildDedupIdentity(null, "12U  Gray Practice"),
    );
    expect(a).toBe(b);
  });
});
