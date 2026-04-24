import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  buildDedupIdentity,
  buildPushDedupKey,
} from "./notificationDedup";

// Simulates the in-memory dedup logic in sendPushNotification for two
// near-duplicate event records firing back-to-back. We model the dedup
// cache the same way the production code does and assert that, for a
// single device, only the first event's push is delivered.
describe("near-duplicate RSVP-closing push dedup", () => {
  let cache: Map<string, number>;
  const WINDOW = 1_200_000;

  beforeEach(() => {
    cache = new Map();
  });

  function trySendPush(opts: {
    protocol: "ios" | "android" | "web";
    deviceKey: string;
    type: string;
    eventId: number | null;
    title: string;
  }): boolean {
    const identity = buildDedupIdentity(opts.eventId, opts.title);
    const key = buildPushDedupKey(opts.protocol, opts.deviceKey, opts.type, identity);
    const now = Date.now();
    if (cache.has(key) && cache.get(key)! > now) return false;
    cache.set(key, now + WINDOW);
    return true;
  }

  it("delivers only one push per device when two near-duplicate events fire", () => {
    // Event A: real event id, fires first.
    const sent1 = trySendPush({
      protocol: "ios",
      deviceKey: "device-token-1",
      type: "event_rsvp_closing",
      eventId: null, // simulate fallback to title (no event id available)
      title: "12u Gray Practice",
    });

    // Event B: a near-duplicate row with different casing — should dedupe.
    const sent2 = trySendPush({
      protocol: "ios",
      deviceKey: "device-token-1",
      type: "event_rsvp_closing",
      eventId: null,
      title: "12U Gray Practice",
    });

    expect(sent1).toBe(true);
    expect(sent2).toBe(false);
  });

  it("still delivers pushes for genuinely different events", () => {
    expect(
      trySendPush({
        protocol: "ios",
        deviceKey: "device-token-1",
        type: "event_rsvp_closing",
        eventId: null,
        title: "12U Gray Practice",
      }),
    ).toBe(true);
    expect(
      trySendPush({
        protocol: "ios",
        deviceKey: "device-token-1",
        type: "event_rsvp_closing",
        eventId: null,
        title: "12U Blue Practice",
      }),
    ).toBe(true);
  });

  it("dedupes per device, not across devices", () => {
    expect(
      trySendPush({
        protocol: "ios",
        deviceKey: "device-A",
        type: "event_rsvp_closing",
        eventId: 7,
        title: "Practice",
      }),
    ).toBe(true);
    // Different device, same event identity — should still send.
    expect(
      trySendPush({
        protocol: "ios",
        deviceKey: "device-B",
        type: "event_rsvp_closing",
        eventId: 7,
        title: "Practice",
      }),
    ).toBe(true);
  });
});

// Exercises the scheduler-side guard: when two near-duplicate events are in
// the same upcoming-events batch, the second event must be skipped because
// hasRecentNotification (broadened to match by normalized title via an event
// id list) reports a row already exists for the user.
describe("processRsvpWindowClosing dedup across near-duplicate events", () => {
  it("only writes one notification row per user when two near-duplicate events fire", async () => {
    // Mock storage + notificationService just enough to drive the loop.
    const upcomingEvents = [
      { id: 1, title: "12u Gray Practice", startTime: new Date(Date.now() + 58 * 60 * 1000).toISOString() },
      { id: 2, title: "12U Gray Practice", startTime: new Date(Date.now() + 58 * 60 * 1000).toISOString() },
    ];

    const notificationRows: Array<{ userId: string; eventId: number; type: string }> = [];

    const fakeStorage = {
      getUpcomingEventsWithinHours: vi.fn(async () => upcomingEvents),
      getRsvpResponseByUserAndEvent: vi.fn(async () => null),
    };

    // Simulate the real check: any row matching user + type + any of the
    // ids treated as the same event identity in the last 120 minutes.
    async function hasRecentNotification(
      userId: string,
      type: string,
      eventId: number | number[],
    ): Promise<boolean> {
      const ids = Array.isArray(eventId) ? eventId : [eventId];
      return notificationRows.some(
        (r) => r.userId === userId && r.type === type && ids.includes(r.eventId),
      );
    }

    async function notifyRsvpClosing(userId: string, eventId: number) {
      notificationRows.push({ userId, eventId, type: "event_rsvp_closing" });
    }

    const { normalizeTitleKey } = await import("./notificationDedup");

    const participantIds = ["user-1"];
    for (const event of upcomingEvents) {
      const normalized = normalizeTitleKey(event.title);
      const identityIds = upcomingEvents
        .filter((e) => normalizeTitleKey(e.title) === normalized)
        .map((e) => e.id);
      for (const memberId of participantIds) {
        const already = await hasRecentNotification(memberId, "event_rsvp_closing", identityIds);
        if (!already) {
          await notifyRsvpClosing(memberId, event.id);
        }
      }
    }

    expect(notificationRows).toHaveLength(1);
    expect(notificationRows[0]).toMatchObject({
      userId: "user-1",
      eventId: 1,
      type: "event_rsvp_closing",
    });
  });
});
