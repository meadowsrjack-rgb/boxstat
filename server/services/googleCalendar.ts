export function parseRecurrence(rrule?: string): {
  isRecurring: boolean;
  recurringType: string | null;
} {
  if (!rrule) {
    return { isRecurring: false, recurringType: null };
  }

  const freqMatch = rrule.match(/FREQ=(\w+)/);
  const intervalMatch = rrule.match(/INTERVAL=(\d+)/);

  if (!freqMatch) {
    return { isRecurring: true, recurringType: null };
  }

  const freq = freqMatch[1];
  const interval = intervalMatch ? parseInt(intervalMatch[1], 10) : 1;

  switch (freq) {
    case "DAILY":
      return { isRecurring: true, recurringType: "daily" };
    case "WEEKLY":
      if (interval === 2) return { isRecurring: true, recurringType: "biweekly" };
      return { isRecurring: true, recurringType: "weekly" };
    case "MONTHLY":
      return { isRecurring: true, recurringType: "monthly" };
    default:
      return { isRecurring: true, recurringType: null };
  }
}

export interface ICalEvent {
  title: string;
  description: string;
  location: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  rrule?: string;
  timezone?: string;
}

export function mapICalEventToAppEvent(
  event: ICalEvent,
  organizationId: string,
  createdBy: string
) {
  const { isRecurring, recurringType } = parseRecurrence(event.rrule);

  return {
    organizationId,
    title: event.title || "Untitled Event",
    description: event.description || "",
    eventType: "other",
    startTime: event.startTime,
    endTime: event.endTime,
    location: event.location || "",
    isRecurring,
    recurringType,
    visibility: { roles: ["player", "coach", "parent", "admin"] },
    assignTo: { roles: ["player", "coach", "parent", "admin"] },
    createdBy,
    status: "active",
    isActive: true,
    playerRsvpEnabled: true,
    timezone: event.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles",
  };
}
