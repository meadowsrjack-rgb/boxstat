// Helpers for deduplicating notifications across near-duplicate event records.
// See task #305: a single user/device should only receive one RSVP-closing
// alert per event window, even when two event rows exist whose titles differ
// only by case or whitespace ("12u Gray Practice" vs "12U Gray Practice").

/**
 * Normalize an event/notification title into a stable key:
 * lowercased, trimmed, and with all internal whitespace collapsed to a
 * single space. Returns "" for null/undefined input so callers can compare
 * safely without extra null checks.
 */
export function normalizeTitleKey(title: string | null | undefined): string {
  if (!title) return "";
  return title
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Build the "stable event identity" portion of a push dedup key.
 * Prefers the event id when available so different events with the same
 * title are still treated as distinct, and falls back to the normalized
 * title for non-event notifications (preserving prior behavior).
 */
export function buildDedupIdentity(
  eventId: number | string | null | undefined,
  title: string | null | undefined,
): string {
  if (eventId !== null && eventId !== undefined && eventId !== "" && eventId !== 0) {
    return `event-${eventId}`;
  }
  return `title-${normalizeTitleKey(title)}`;
}

/**
 * Build the full in-memory push dedup key for a single device delivery.
 * `protocol` distinguishes web/ios/android channels so the same identity
 * does not clobber across transports.
 */
export function buildPushDedupKey(
  protocol: "web" | "ios" | "android",
  deviceKey: string,
  type: string | null | undefined,
  identity: string,
): string {
  return `${protocol}:${deviceKey}:${type || "notification"}:${identity}`;
}
