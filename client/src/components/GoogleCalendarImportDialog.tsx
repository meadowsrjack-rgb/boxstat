import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarPlus, Loader2, Download, ExternalLink, ChevronRight, ChevronDown, Repeat } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const pad = (n: number) => String(n).padStart(2, "0");

function formatTimestampForGCal(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function formatDateOnlyForGCal(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

function nextDayDateOnly(dateStr: string): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + 1);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function isAllDayEvent(event: any): boolean {
  return !!event.isAllDay;
}

const DAY_NAMES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const DAY_LABELS: Record<string, string> = {
  SU: "Sun", MO: "Mon", TU: "Tue", WE: "Wed", TH: "Thu", FR: "Fri", SA: "Sat"
};

interface RecurringGroup {
  key: string;
  title: string;
  eventType: string;
  recurringType: string;
  location?: string;
  description?: string;
  events: any[];
  firstEvent: any;
  lastEvent: any;
  daysOfWeek: string[];
  recurrenceSummary: string;
  rrule: string;
}

interface DisplayItem {
  type: "group" | "single";
  group?: RecurringGroup;
  event?: any;
}

function normalizeVisibility(v: any): string {
  if (!v || typeof v !== "object") return "";
  const sorted: any = {};
  Object.keys(v).sort().forEach((k) => {
    sorted[k] = Array.isArray(v[k]) ? [...v[k]].sort() : v[k];
  });
  return JSON.stringify(sorted);
}

function groupRecurringEvents(events: any[]): DisplayItem[] {
  const groupMap = new Map<string, any[]>();
  const singles: any[] = [];

  for (const event of events) {
    if (event.isRecurring && event.recurringType) {
      const key = [
        event.title || "",
        event.eventType || event.type || "",
        normalizeVisibility(event.visibility),
        event.recurringType || "",
      ].join("|||");
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(event);
    } else {
      singles.push(event);
    }
  }

  const items: DisplayItem[] = [];

  for (const [key, groupEvents] of groupMap) {
    if (groupEvents.length < 2) {
      singles.push(...groupEvents);
      continue;
    }

    const sorted = [...groupEvents].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
    const firstEvent = sorted[0];
    const lastEvent = sorted[sorted.length - 1];

    const daysOfWeek = [...new Set(sorted.map((e) => DAY_NAMES[new Date(e.startTime).getDay()]))];
    const orderedDays = DAY_NAMES.filter((d) => daysOfWeek.includes(d));

    const recurrenceSummary = buildRecurrenceSummary(firstEvent.recurringType, orderedDays, sorted.length);
    const allDay = isAllDayEvent(firstEvent);
    const rrule = buildRRule(firstEvent.recurringType, orderedDays, lastEvent, allDay);

    items.push({
      type: "group",
      group: {
        key,
        title: firstEvent.title || "Untitled Event",
        eventType: firstEvent.eventType || firstEvent.type || "",
        recurringType: firstEvent.recurringType,
        location: firstEvent.location,
        description: firstEvent.description,
        events: sorted,
        firstEvent,
        lastEvent,
        daysOfWeek: orderedDays,
        recurrenceSummary,
        rrule,
      },
    });
  }

  items.sort((a, b) => {
    const aTime = a.type === "group" ? new Date(a.group!.firstEvent.startTime).getTime() : new Date(a.event!.startTime).getTime();
    const bTime = b.type === "group" ? new Date(b.group!.firstEvent.startTime).getTime() : new Date(b.event!.startTime).getTime();
    return aTime - bTime;
  });

  const singleItems: DisplayItem[] = singles
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .map((event) => ({ type: "single" as const, event }));

  return [...items, ...singleItems].sort((a, b) => {
    const aTime = a.type === "group" ? new Date(a.group!.firstEvent.startTime).getTime() : new Date(a.event!.startTime).getTime();
    const bTime = b.type === "group" ? new Date(b.group!.firstEvent.startTime).getTime() : new Date(b.event!.startTime).getTime();
    return aTime - bTime;
  });
}

function buildRecurrenceSummary(recurringType: string, days: string[], count: number): string {
  const dayLabels = days.map((d) => DAY_LABELS[d] || d).join(" & ");
  switch (recurringType) {
    case "daily":
      return `Daily (${count} occurrences)`;
    case "weekly":
      return days.length > 0 ? `Weekly on ${dayLabels} (${count} occurrences)` : `Weekly (${count} occurrences)`;
    case "biweekly":
      return days.length > 0 ? `Every 2 weeks on ${dayLabels} (${count} occurrences)` : `Every 2 weeks (${count} occurrences)`;
    case "monthly":
      return `Monthly (${count} occurrences)`;
    default:
      return `${recurringType} (${count} occurrences)`;
  }
}

function buildRRule(recurringType: string, days: string[], lastEvent: any, allDay?: boolean): string {
  const untilDate = allDay
    ? formatDateOnlyForGCal(lastEvent.endTime || lastEvent.startTime)
    : formatTimestampForGCal(lastEvent.endTime || lastEvent.startTime);
  let freq: string;
  let interval = 1;

  switch (recurringType) {
    case "daily":
      freq = "DAILY";
      break;
    case "weekly":
      freq = "WEEKLY";
      break;
    case "biweekly":
      freq = "WEEKLY";
      interval = 2;
      break;
    case "monthly":
      freq = "MONTHLY";
      break;
    default:
      freq = "WEEKLY";
  }

  let rule = `FREQ=${freq}`;
  if (interval > 1) rule += `;INTERVAL=${interval}`;
  if ((freq === "WEEKLY") && days.length > 0) {
    rule += `;BYDAY=${days.join(",")}`;
  }
  rule += `;UNTIL=${untilDate}`;
  return rule;
}

function buildGCalRecur(recurringType: string, days: string[], lastEvent: any, allDay?: boolean): string {
  const rrule = buildRRule(recurringType, days, lastEvent, allDay);
  return `RRULE:${rrule}`;
}

function generateICalFile(events: any[], groups: RecurringGroup[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BoxStat//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  const groupedEventIds = new Set<number>();
  for (const group of groups) {
    for (const e of group.events) groupedEventIds.add(e.id);
  }

  for (const group of groups) {
    const event = group.firstEvent;
    const uid = `boxstat-recurring-${group.events.map((e: any) => e.id).join("-")}@boxstat.app`;
    const allDay = isAllDayEvent(event);

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);

    if (allDay) {
      lines.push(`DTSTART;VALUE=DATE:${formatDateOnlyForGCal(event.startTime)}`);
      lines.push(`DTEND;VALUE=DATE:${event.endTime ? nextDayDateOnly(event.endTime) : nextDayDateOnly(event.startTime)}`);
    } else {
      lines.push(`DTSTART:${formatTimestampForGCal(event.startTime)}`);
      const end = event.endTime
        ? formatTimestampForGCal(event.endTime)
        : formatTimestampForGCal(new Date(new Date(event.startTime).getTime() + 3600000).toISOString());
      lines.push(`DTEND:${end}`);
    }

    lines.push(`RRULE:${group.rrule}`);
    lines.push(`SUMMARY:${escapeICalText(event.title || "Untitled Event")}`);
    if (event.description) lines.push(`DESCRIPTION:${escapeICalText(event.description)}`);
    if (event.location) lines.push(`LOCATION:${escapeICalText(event.location)}`);
    lines.push(`DTSTAMP:${formatTimestampForGCal(new Date().toISOString())}`);
    lines.push("END:VEVENT");
  }

  for (const event of events) {
    if (groupedEventIds.has(event.id)) continue;

    const uid = `boxstat-event-${event.id}@boxstat.app`;
    const allDay = isAllDayEvent(event);

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);

    if (allDay) {
      lines.push(`DTSTART;VALUE=DATE:${formatDateOnlyForGCal(event.startTime)}`);
      lines.push(`DTEND;VALUE=DATE:${event.endTime ? nextDayDateOnly(event.endTime) : nextDayDateOnly(event.startTime)}`);
    } else {
      lines.push(`DTSTART:${formatTimestampForGCal(event.startTime)}`);
      const end = event.endTime
        ? formatTimestampForGCal(event.endTime)
        : formatTimestampForGCal(new Date(new Date(event.startTime).getTime() + 3600000).toISOString());
      lines.push(`DTEND:${end}`);
    }

    lines.push(`SUMMARY:${escapeICalText(event.title || "Untitled Event")}`);
    if (event.description) lines.push(`DESCRIPTION:${escapeICalText(event.description)}`);
    if (event.location) lines.push(`LOCATION:${escapeICalText(event.location)}`);
    lines.push(`DTSTAMP:${formatTimestampForGCal(new Date().toISOString())}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function generateGoogleCalendarUrl(event: any, recurrence?: { recurringType: string; days: string[]; lastEvent: any }): string {
  const allDay = isAllDayEvent(event);
  let dates: string;

  if (allDay) {
    const startDate = formatDateOnlyForGCal(event.startTime);
    const endDate = event.endTime ? nextDayDateOnly(event.endTime) : nextDayDateOnly(event.startTime);
    dates = `${startDate}/${endDate}`;
  } else {
    const start = formatTimestampForGCal(event.startTime);
    const end = event.endTime
      ? formatTimestampForGCal(event.endTime)
      : formatTimestampForGCal(new Date(new Date(event.startTime).getTime() + 3600000).toISOString());
    dates = `${start}/${end}`;
  }

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title || "Untitled Event",
    dates,
  });

  if (event.location) params.set("location", event.location);
  if (event.description) params.set("details", event.description);

  if (recurrence) {
    const recur = buildGCalRecur(recurrence.recurringType, recurrence.days, recurrence.lastEvent, isAllDayEvent(event));
    params.set("recur", recur);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function formatEventTime(dateTime: string): string {
  const d = new Date(dateTime);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateShort(dateTime: string): string {
  const d = new Date(dateTime);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function GoogleCalendarImportDialog() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<number>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const { data: events = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/events"],
    enabled: isOpen,
  });

  const upcomingEvents = useMemo(
    () =>
      events
        .filter((e: any) => new Date(e.startTime) >= new Date())
        .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    [events]
  );

  const displayItems = useMemo(() => groupRecurringEvents(upcomingEvents), [upcomingEvents]);

  const allEventIds = useMemo(() => upcomingEvents.map((e: any) => e.id), [upcomingEvents]);

  const resetState = () => {
    setSelectedEventIds(new Set());
    setExpandedGroups(new Set());
  };

  const toggleEvent = (eventId: number) => {
    setSelectedEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  };

  const toggleGroup = (group: RecurringGroup) => {
    const groupIds = group.events.map((e: any) => e.id);
    const allSelected = groupIds.every((id: number) => selectedEventIds.has(id));
    setSelectedEventIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        groupIds.forEach((id: number) => next.delete(id));
      } else {
        groupIds.forEach((id: number) => next.add(id));
      }
      return next;
    });
  };

  const toggleExpandGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedEventIds.size === upcomingEvents.length) {
      setSelectedEventIds(new Set());
    } else {
      setSelectedEventIds(new Set(allEventIds));
    }
  };

  const selectedEvents = upcomingEvents.filter((e: any) => selectedEventIds.has(e.id));

  const selectedGroups = useMemo(() => {
    const groups: RecurringGroup[] = [];
    for (const item of displayItems) {
      if (item.type === "group" && item.group) {
        const groupIds = item.group.events.map((e: any) => e.id);
        if (groupIds.every((id: number) => selectedEventIds.has(id))) {
          groups.push(item.group);
        }
      }
    }
    return groups;
  }, [displayItems, selectedEventIds]);

  const handleDownloadIcs = () => {
    if (selectedEvents.length === 0) return;
    const ical = generateICalFile(selectedEvents, selectedGroups);
    const blob = new Blob([ical], { type: "text/calendar;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "boxstat-events.ics";
    a.click();
    window.URL.revokeObjectURL(url);
    toast({
      title: "Calendar file downloaded",
      description: `${selectedEvents.length} event${selectedEvents.length !== 1 ? "s" : ""} exported. Open the .ics file to add them to your calendar.`,
    });
  };

  const handleAddToGoogleCalendar = () => {
    if (selectedEvents.length === 0) return;
    if (selectedEvents.length === 1 && selectedGroups.length === 0) {
      window.open(generateGoogleCalendarUrl(selectedEvents[0]), "_blank");
      return;
    }
    if (selectedGroups.length === 1 && selectedGroups[0].events.length === selectedEvents.length) {
      const group = selectedGroups[0];
      const url = generateGoogleCalendarUrl(group.firstEvent, {
        recurringType: group.recurringType,
        days: group.daysOfWeek,
        lastEvent: group.lastEvent,
      });
      window.open(url, "_blank");
      return;
    }
    handleDownloadIcs();
  };

  const totalSelectableCount = upcomingEvents.length;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) resetState();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" title="Add events to Google Calendar">
          <CalendarPlus className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Events to Google Calendar</DialogTitle>
          <DialogDescription>
            Select upcoming events to add to your Google Calendar or download as a calendar file.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : upcomingEvents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CalendarPlus className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">No upcoming events</p>
            <p className="text-xs mt-1">Create some events first, then come back to export them.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col flex-1 min-h-0 space-y-3 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedEventIds.size === totalSelectableCount && totalSelectableCount > 0}
                    onCheckedChange={toggleAll}
                  />
                  <span className="text-sm font-medium">
                    {selectedEventIds.size} of {totalSelectableCount} selected
                  </span>
                </div>
              </div>

              <div className="overflow-y-auto flex-1 border rounded-md divide-y max-h-[50vh]">
                {displayItems.map((item) => {
                  if (item.type === "group" && item.group) {
                    const group = item.group;
                    const isExpanded = expandedGroups.has(group.key);
                    const groupIds = group.events.map((e: any) => e.id);
                    const allGroupSelected = groupIds.every((id: number) => selectedEventIds.has(id));
                    const someGroupSelected = !allGroupSelected && groupIds.some((id: number) => selectedEventIds.has(id));

                    return (
                      <div key={`group-${group.key}`}>
                        <div className="flex items-start gap-3 p-3 hover:bg-muted/50">
                          <Checkbox
                            checked={allGroupSelected ? true : someGroupSelected ? "indeterminate" : false}
                            className="mt-1"
                            onCheckedChange={() => toggleGroup(group)}
                          />
                          <button
                            type="button"
                            className="flex-1 min-w-0 text-left cursor-pointer"
                            onClick={() => toggleExpandGroup(group.key)}
                          >
                            <div className="flex items-center gap-2">
                              <Repeat className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                              <span className="font-medium text-sm truncate">{group.title}</span>
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {group.recurrenceSummary}
                            </div>
                            <div className="text-xs text-muted-foreground/70 mt-0.5">
                              {formatDateShort(group.firstEvent.startTime)} – {formatDateShort(group.lastEvent.startTime)}
                            </div>
                            {group.location && (
                              <div className="text-xs text-muted-foreground/70 mt-0.5 truncate">
                                {group.location}
                              </div>
                            )}
                            <div className="flex gap-1 mt-1">
                              {group.eventType && (
                                <Badge variant="outline" className="text-xs capitalize">
                                  {group.eventType}
                                </Badge>
                              )}
                              <Badge variant="secondary" className="text-xs">
                                {group.events.length} events
                              </Badge>
                            </div>
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="border-t bg-muted/20">
                            {group.events.map((event: any) => (
                              <label
                                key={event.id}
                                className="flex items-start gap-3 p-3 pl-10 hover:bg-muted/50 cursor-pointer border-t first:border-t-0"
                              >
                                <Checkbox
                                  checked={selectedEventIds.has(event.id)}
                                  onCheckedChange={() => toggleEvent(event.id)}
                                  className="mt-1"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-muted-foreground">
                                    {formatEventTime(event.startTime)}
                                    {event.endTime && ` – ${formatEventTime(event.endTime)}`}
                                  </div>
                                  {event.location && (
                                    <div className="text-xs text-muted-foreground/70 mt-0.5 truncate">
                                      {event.location}
                                    </div>
                                  )}
                                </div>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }

                  const event = item.event!;
                  return (
                    <label
                      key={event.id}
                      className="flex items-start gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedEventIds.has(event.id)}
                        onCheckedChange={() => toggleEvent(event.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {event.title}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {formatEventTime(event.startTime)}
                          {event.endTime && ` – ${formatEventTime(event.endTime)}`}
                        </div>
                        {event.location && (
                          <div className="text-xs text-muted-foreground/70 mt-0.5 truncate">
                            {event.location}
                          </div>
                        )}
                        <div className="flex gap-1 mt-1">
                          {(event.eventType || event.type) && (
                            <Badge variant="outline" className="text-xs capitalize">
                              {event.eventType || event.type}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={handleDownloadIcs}
                disabled={selectedEventIds.size === 0}
                className="w-full sm:w-auto"
              >
                <Download className="w-4 h-4 mr-2" />
                Download .ics File
              </Button>
              <Button
                onClick={handleAddToGoogleCalendar}
                disabled={selectedEventIds.size === 0}
                className="w-full sm:w-auto"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Add to Google Calendar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
