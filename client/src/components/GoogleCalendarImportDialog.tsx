import { useState } from "react";
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
import { CalendarPlus, Loader2, Download, ExternalLink } from "lucide-react";
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

function generateICalFile(events: any[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BoxStat//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const event of events) {
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
    if (event.description) {
      lines.push(`DESCRIPTION:${escapeICalText(event.description)}`);
    }
    if (event.location) {
      lines.push(`LOCATION:${escapeICalText(event.location)}`);
    }
    lines.push(`DTSTAMP:${formatTimestampForGCal(new Date().toISOString())}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function generateGoogleCalendarUrl(event: any): string {
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

export function GoogleCalendarImportDialog() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<number>>(new Set());

  const { data: events = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/events"],
    enabled: isOpen,
  });

  const upcomingEvents = events
    .filter((e: any) => new Date(e.startTime) >= new Date())
    .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const resetState = () => {
    setSelectedEventIds(new Set());
  };

  const toggleEvent = (eventId: number) => {
    setSelectedEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedEventIds.size === upcomingEvents.length) {
      setSelectedEventIds(new Set());
    } else {
      setSelectedEventIds(new Set(upcomingEvents.map((e: any) => e.id)));
    }
  };

  const selectedEvents = upcomingEvents.filter((e: any) => selectedEventIds.has(e.id));

  const handleDownloadIcs = () => {
    if (selectedEvents.length === 0) return;
    const ical = generateICalFile(selectedEvents);
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
    if (selectedEvents.length === 1) {
      window.open(generateGoogleCalendarUrl(selectedEvents[0]), "_blank");
      return;
    }
    handleDownloadIcs();
    toast({
      title: "Calendar file downloaded",
      description: `Open the .ics file with Google Calendar to add all ${selectedEvents.length} events at once.`,
    });
  };

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
                    checked={selectedEventIds.size === upcomingEvents.length && upcomingEvents.length > 0}
                    onCheckedChange={toggleAll}
                  />
                  <span className="text-sm font-medium">
                    {selectedEventIds.size} of {upcomingEvents.length} selected
                  </span>
                </div>
              </div>

              <div className="overflow-y-auto flex-1 border rounded-md divide-y max-h-[50vh]">
                {upcomingEvents.map((event: any) => (
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
                        {event.endTime && ` - ${formatEventTime(event.endTime)}`}
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
                ))}
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
