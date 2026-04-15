import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Loader2, CheckCircle2, FileUp, Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ParsedICalEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  rrule?: string;
  timezone?: string;
}

function unfoldICalLines(raw: string): string[] {
  const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return normalized.replace(/\n[ \t]/g, "").split("\n");
}

function unescapeICalText(text: string): string {
  return text
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function localToUTC(year: string, month: string, day: string, hour: string, minute: string, second: string, tzid: string): string {
  try {
    const localStr = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
    const testDate = new Date(localStr + "Z");
    
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tzid,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false,
    });

    const refParts = formatter.formatToParts(testDate);
    const getPart = (type: string) => refParts.find(p => p.type === type)?.value || "";
    const utcAsLocal = `${getPart("year")}-${getPart("month")}-${getPart("day")}T${getPart("hour")}:${getPart("minute")}:${getPart("second")}`;

    const diffMs = new Date(utcAsLocal + "Z").getTime() - testDate.getTime();
    const corrected = new Date(testDate.getTime() - diffMs);
    return corrected.toISOString();
  } catch {
    return `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
  }
}

function parseICalDateTime(value: string, tzid?: string): { dateTime: string; isAllDay: boolean; timezone?: string } {
  const cleaned = value.trim();

  if (/^\d{8}$/.test(cleaned)) {
    const year = cleaned.substring(0, 4);
    const month = cleaned.substring(4, 6);
    const day = cleaned.substring(6, 8);
    return {
      dateTime: `${year}-${month}-${day}T09:00:00.000Z`,
      isAllDay: true,
      timezone: tzid,
    };
  }

  if (/^\d{8}T\d{6}Z$/.test(cleaned)) {
    const year = cleaned.substring(0, 4);
    const month = cleaned.substring(4, 6);
    const day = cleaned.substring(6, 8);
    const hour = cleaned.substring(9, 11);
    const minute = cleaned.substring(11, 13);
    const second = cleaned.substring(13, 15);
    return {
      dateTime: `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`,
      isAllDay: false,
      timezone: tzid,
    };
  }

  if (/^\d{8}T\d{6}$/.test(cleaned)) {
    const year = cleaned.substring(0, 4);
    const month = cleaned.substring(4, 6);
    const day = cleaned.substring(6, 8);
    const hour = cleaned.substring(9, 11);
    const minute = cleaned.substring(11, 13);
    const second = cleaned.substring(13, 15);
    if (tzid) {
      return {
        dateTime: localToUTC(year, month, day, hour, minute, second, tzid),
        isAllDay: false,
        timezone: tzid,
      };
    }
    return { dateTime: `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`, isAllDay: false };
  }

  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    return { dateTime: parsed.toISOString(), isAllDay: false, timezone: tzid };
  }
  return { dateTime: "", isAllDay: false };
}

function parseICalFile(content: string): ParsedICalEvent[] {
  const lines = unfoldICalLines(content);
  const events: ParsedICalEvent[] = [];
  let inEvent = false;
  let currentEvent: Record<string, string> = {};
  let eventIndex = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "BEGIN:VEVENT") {
      inEvent = true;
      currentEvent = {};
      continue;
    }

    if (trimmed === "END:VEVENT") {
      inEvent = false;

      const startProp = currentEvent["DTSTART"] || "";
      const endProp = currentEvent["DTEND"] || "";
      const startTzid = currentEvent["DTSTART_TZID"];
      const endTzid = currentEvent["DTEND_TZID"];

      const startParsed = parseICalDateTime(startProp, startTzid);

      if (!startParsed.dateTime) {
        eventIndex++;
        continue;
      }

      let endParsed = endProp
        ? parseICalDateTime(endProp, endTzid)
        : null;

      if (startParsed.isAllDay && endParsed && endParsed.isAllDay) {
        const endDate = new Date(endParsed.dateTime);
        endDate.setDate(endDate.getDate() - 1);
        if (endDate.getTime() < new Date(startParsed.dateTime).getTime()) {
          endParsed.dateTime = startParsed.dateTime.replace("T09:00:00", "T17:00:00");
        } else {
          endParsed.dateTime = endDate.toISOString().split("T")[0] + "T17:00:00.000Z";
        }
      }

      if (!endParsed || !endParsed.dateTime) {
        if (startParsed.isAllDay) {
          endParsed = {
            dateTime: startParsed.dateTime.replace("T09:00:00", "T17:00:00"),
            isAllDay: true,
            timezone: startParsed.timezone,
          };
        } else {
          const endDate = new Date(startParsed.dateTime);
          endDate.setHours(endDate.getHours() + 1);
          endParsed = {
            dateTime: endDate.toISOString(),
            isAllDay: false,
            timezone: startParsed.timezone,
          };
        }
      }

      if (new Date(endParsed.dateTime) <= new Date(startParsed.dateTime)) {
        const endDate = new Date(startParsed.dateTime);
        endDate.setHours(endDate.getHours() + 1);
        endParsed.dateTime = endDate.toISOString();
      }

      const uid = currentEvent["UID"] || "";
      const recurrenceId = currentEvent["RECURRENCE-ID"] || "";
      const stableId = `${uid}-${recurrenceId || eventIndex}`;
      eventIndex++;

      events.push({
        id: stableId,
        title: unescapeICalText(currentEvent["SUMMARY"] || "Untitled Event"),
        description: unescapeICalText(currentEvent["DESCRIPTION"] || ""),
        location: unescapeICalText(currentEvent["LOCATION"] || ""),
        startTime: startParsed.dateTime,
        endTime: endParsed.dateTime,
        isAllDay: startParsed.isAllDay,
        rrule: currentEvent["RRULE"],
        timezone: startParsed.timezone || endParsed.timezone,
      });
      continue;
    }

    if (inEvent) {
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx === -1) continue;

      let key = trimmed.substring(0, colonIdx);
      const value = trimmed.substring(colonIdx + 1);

      let tzid: string | undefined;
      if (key.includes(";")) {
        const parts = key.split(";");
        key = parts[0];
        for (const param of parts.slice(1)) {
          if (param.startsWith("TZID=")) {
            tzid = param.substring(5);
          }
        }
      }

      if (tzid && (key === "DTSTART" || key === "DTEND")) {
        currentEvent[key + "_TZID"] = tzid;
      }

      currentEvent[key] = value;
    }
  }

  return events;
}

function formatEventTime(dateTime: string, isAllDay: boolean): string {
  const d = new Date(dateTime);
  if (isAllDay) {
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) + " (All day)";
  }
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
  const [parsedEvents, setParsedEvents] = useState<ParsedICalEvent[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [fileName, setFileName] = useState<string>("");
  const [calendarUrl, setCalendarUrl] = useState("");
  const [inputMode, setInputMode] = useState<"file" | "url">("url");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const step = parsedEvents.length > 0 ? "events" : "upload";

  const resetState = () => {
    setParsedEvents([]);
    setSelectedEventIds(new Set());
    setFileName("");
    setCalendarUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const processICalText = (text: string, source: string) => {
    if (!text || typeof text !== "string") {
      toast({
        title: "Failed to parse calendar",
        description: "No calendar data was received. Please try again.",
        variant: "destructive",
      });
      return;
    }
    try {
      const events = parseICalFile(text);
      if (events.length === 0) {
        toast({
          title: "No events found",
          description: "The calendar data doesn't contain any events.",
          variant: "destructive",
        });
        return;
      }
      events.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      setParsedEvents(events);
      setSelectedEventIds(new Set(events.map((e) => e.id)));
      setFileName(source);
      toast({
        title: `Found ${events.length} event${events.length !== 1 ? "s" : ""}`,
        description: "Select which events you'd like to import.",
      });
    } catch (err) {
      console.error("[iCal parse error]", err, "content length:", text?.length, "starts with:", text?.substring(0, 100));
      toast({
        title: "Failed to parse calendar",
        description: "The data doesn't appear to be a valid iCal format.",
        variant: "destructive",
      });
    }
  };

  const fetchFromUrl = useMutation({
    mutationFn: async () => {
      const url = calendarUrl.trim();
      if (!url) throw new Error("Please enter a calendar URL");
      const result = await apiRequest("POST", "/api/ical/fetch-url", { url });
      if (result && typeof result === "object" && "content" in result) {
        return result as { content: string };
      }
      if (result instanceof Response) {
        const json = await result.json();
        return json as { content: string };
      }
      throw new Error("Unexpected response format from server");
    },
    onSuccess: (data) => {
      processICalText(data.content, "Calendar URL");
    },
    onError: (err: any) => {
      toast({
        title: "Failed to fetch calendar",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    if (!name.endsWith(".ics") && !name.endsWith(".ical")) {
      toast({
        title: "Invalid file",
        description: "Please upload an .ics file exported from Google Calendar or another calendar app.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      processICalText(text, file.name);
    };
    reader.readAsText(file);
  };

  const importEvents = useMutation({
    mutationFn: async () => {
      const eventsToImport = parsedEvents
        .filter((e) => selectedEventIds.has(e.id))
        .map((e) => ({
          title: e.title,
          description: e.description,
          location: e.location,
          startTime: e.startTime,
          endTime: e.endTime,
          isAllDay: e.isAllDay,
          rrule: e.rrule,
          timezone: e.timezone,
        }));
      return apiRequest("POST", "/api/ical/import", { events: eventsToImport });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      const imported = data.imported || 0;
      const failed = data.failed || 0;
      toast({
        title: "Import Complete",
        description: `${imported} event${imported !== 1 ? "s" : ""} imported successfully${failed > 0 ? `. ${failed} failed.` : "."}`,
        variant: failed > 0 ? "destructive" : "default",
      });
      setIsOpen(false);
      resetState();
    },
    onError: (err: any) => {
      toast({
        title: "Import failed",
        description: err.message || "An error occurred while importing events.",
        variant: "destructive",
      });
    },
  });

  const toggleEvent = (eventId: string) => {
    setSelectedEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedEventIds.size === parsedEvents.length) {
      setSelectedEventIds(new Set());
    } else {
      setSelectedEventIds(new Set(parsedEvents.map((e) => e.id)));
    }
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
        <Button variant="outline" size="icon" title="Import from Google Calendar (.ics)">
          <Calendar className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === "upload" ? "Import Calendar Events" : "Select Events to Import"}
          </DialogTitle>
          <DialogDescription>
            {step === "upload"
              ? "Paste a calendar URL or upload an .ics file from Google Calendar, Apple Calendar, Outlook, or any other calendar app."
              : `${parsedEvents.length} event${parsedEvents.length !== 1 ? "s" : ""} found in ${fileName}`}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4 py-4">
            <div className="flex border rounded-lg overflow-hidden">
              <button
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${inputMode === "url" ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted"}`}
                onClick={() => setInputMode("url")}
              >
                <Link2 className="w-4 h-4" />
                Paste URL
              </button>
              <button
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${inputMode === "file" ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted"}`}
                onClick={() => setInputMode("file")}
              >
                <FileUp className="w-4 h-4" />
                Upload File
              </button>
            </div>

            {inputMode === "url" && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Input
                    placeholder="Paste your calendar URL here..."
                    value={calendarUrl}
                    onChange={(e) => setCalendarUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && calendarUrl.trim()) fetchFromUrl.mutate();
                    }}
                  />
                  <Button
                    className="w-full"
                    onClick={() => fetchFromUrl.mutate()}
                    disabled={!calendarUrl.trim() || fetchFromUrl.isPending}
                  >
                    {fetchFromUrl.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Fetching events...
                      </>
                    ) : (
                      "Fetch Events"
                    )}
                  </Button>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <p className="text-xs font-medium">How to get your Google Calendar URL:</p>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Go to <span className="font-medium">calendar.google.com</span></li>
                    <li>Click the three dots next to your calendar, then <span className="font-medium">Settings and sharing</span></li>
                    <li>Scroll to <span className="font-medium">Integrate calendar</span></li>
                    <li>Copy the <span className="font-medium">Secret address in iCal format</span> (or Public address if the calendar is public)</li>
                  </ol>
                </div>
              </div>
            )}

            {inputMode === "file" && (
              <div className="space-y-3">
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileUp className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium mb-1">Click to upload .ics file</p>
                  <p className="text-xs text-muted-foreground">
                    Export your calendar from Google Calendar, Outlook, or Apple Calendar
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".ics,.ical"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <p className="text-xs font-medium">How to export from Google Calendar:</p>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Go to <span className="font-medium">calendar.google.com</span></li>
                    <li>Click the gear icon, then <span className="font-medium">Settings</span></li>
                    <li>Under <span className="font-medium">Import & export</span>, click <span className="font-medium">Export</span></li>
                    <li>Download and unzip the file, then upload the .ics file here</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        )}

        {step === "events" && (
          <div className="flex flex-col flex-1 min-h-0 space-y-3 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedEventIds.size === parsedEvents.length && parsedEvents.length > 0}
                  onCheckedChange={toggleAll}
                />
                <span className="text-sm font-medium">
                  {selectedEventIds.size} of {parsedEvents.length} selected
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={resetState}>
                Upload Different File
              </Button>
            </div>

            <div className="overflow-y-auto flex-1 border rounded-md divide-y max-h-[50vh]">
              {parsedEvents.map((event) => (
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
                      {formatEventTime(event.startTime, event.isAllDay)}
                    </div>
                    {event.location && (
                      <div className="text-xs text-muted-foreground/70 mt-0.5 truncate">
                        {event.location}
                      </div>
                    )}
                    <div className="flex gap-1 mt-1">
                      {event.isAllDay && (
                        <Badge variant="outline" className="text-xs">All Day</Badge>
                      )}
                      {event.rrule && (
                        <Badge variant="secondary" className="text-xs">Recurring</Badge>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === "events" && (
          <DialogFooter>
            <Button
              onClick={() => importEvents.mutate()}
              disabled={selectedEventIds.size === 0 || importEvents.isPending}
            >
              {importEvents.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Importing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Import {selectedEventIds.size} Event{selectedEventIds.size !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
