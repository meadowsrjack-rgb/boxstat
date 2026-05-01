import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm, useFieldArray, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Plus, Trash2, Settings2, ChevronDown, ChevronRight, X } from "lucide-react";
import { LocationSearch } from "@/components/LocationSearch";
import DateTimeRangePicker from "@/components/DateTimeRangePicker";
import EventWindowsConfigurator from "@/components/EventWindowsConfigurator";
import {
  TIMEZONE_OPTIONS,
  getBrowserTimezone,
  localDatetimeToUTC,
  utcToLocalDatetime,
  ensureUtcString,
} from "@/lib/time";
import type { EventWindow } from "@shared/schema";

const eventRowSchema = z.object({
  title: z.string().min(1, "Event title is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  location: z.string().min(1, "Location is required"),
  meetingLink: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  facilityId: z.number().nullable().optional(),
  courtName: z.string().optional(),
  locationType: z.enum(["physical", "online"]),
});

const createEventSchema = z.object({
  type: z.enum([
    "game", "tournament", "camp", "exhibition", "practice", "skills",
    "workshop", "talk", "combine", "training", "meeting", "course",
    "tryout", "skills-assessment", "team-building", "parent-meeting",
    "equipment-pickup", "photo-day", "award-ceremony", "fnh",
  ]),
  description: z.string().optional(),
  events: z.array(eventRowSchema).min(1, "At least one event is required"),
});

type EventRowValue = z.infer<typeof eventRowSchema>;
type CreateEventFormValues = z.infer<typeof createEventSchema>;

const emptyRow: EventRowValue = {
  title: "",
  startTime: "",
  endTime: "",
  location: "",
  meetingLink: "",
  latitude: undefined,
  longitude: undefined,
  facilityId: null,
  courtName: "",
  locationType: "physical",
};

interface CreateEventDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  duplicatingEvent: any | null;
  teams: any[];
  programs: any[];
  facilities: any[];
  organization: any;
}

function getDefaultTimezone() {
  const browserTz = getBrowserTimezone();
  return TIMEZONE_OPTIONS.find((tz) => tz.value === browserTz) ? browserTz : "America/Los_Angeles";
}

function shiftDatetimeByDays(value: string, days: number): string {
  if (!value || !value.includes("T")) return value;
  const [datePart, timePart] = value.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  if (!y || !m || !d) return value;
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}T${timePart}`;
}

export function CreateEventDialog({
  isOpen,
  onOpenChange,
  duplicatingEvent,
  teams,
  programs,
  facilities,
  organization,
}: CreateEventDialogProps) {
  const { toast } = useToast();

  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<"daily" | "weekly" | "biweekly" | "monthly">("weekly");
  const [recurrenceCount, setRecurrenceCount] = useState(4);
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const [recurrenceEndType, setRecurrenceEndType] = useState<"count" | "date">("count");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
  const [playerRsvpEnabled, setPlayerRsvpEnabled] = useState(true);
  const [eventTimezone, setEventTimezone] = useState(getDefaultTimezone);
  const [isEveryoneSelected, setIsEveryoneSelected] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [eventWindows, setEventWindows] = useState<Partial<EventWindow>[]>([]);
  const [showFacilityManager, setShowFacilityManager] = useState(false);
  const [newFacilityName, setNewFacilityName] = useState("");
  const [newFacilityAddress, setNewFacilityAddress] = useState("");
  const [newFacilityLat, setNewFacilityLat] = useState("");
  const [newFacilityLng, setNewFacilityLng] = useState("");

  const { data: allUsers = [] } = useQuery<any[]>({ queryKey: ["/api/users"] });
  const { data: divisions = [] } = useQuery<any[]>({ queryKey: ["/api/divisions"] });

  const form = useForm<CreateEventFormValues>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      type: "practice",
      description: "",
      events: [{ ...emptyRow }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "events",
  });

  const resetAll = () => {
    form.reset({
      type: "practice",
      description: "",
      events: [{ ...emptyRow }],
    });
    setEventWindows([]);
    setIsEveryoneSelected(true);
    setExpandedSections({});
    setSelectedUsers([]);
    setSelectedTeams([]);
    setSelectedDivisions([]);
    setSelectedPrograms([]);
    setSelectedRoles([]);
    setUserSearch("");
    setIsRecurring(false);
    setRecurrenceFrequency("weekly");
    setRecurrenceCount(4);
    setRecurrenceDays([]);
    setRecurrenceEndType("count");
    setRecurrenceEndDate("");
    setPlayerRsvpEnabled(true);
    setEventTimezone(getDefaultTimezone());
    setShowFacilityManager(false);
  };

  useEffect(() => {
    if (!isOpen) return;

    if (duplicatingEvent) {
      const event = duplicatingEvent;
      const etz = event.timezone || "America/Los_Angeles";
      const localStart = event.startTime ? utcToLocalDatetime(ensureUtcString(event.startTime), etz) : "";
      const localEnd = event.endTime ? utcToLocalDatetime(ensureUtcString(event.endTime), etz) : "";

      const allRoles = ["player", "coach", "parent", "admin"];
      const hasAllRoles =
        event.assignTo?.roles && allRoles.every((r: string) => event.assignTo.roles.includes(r));

      setEventTimezone(etz);

      if (hasAllRoles) {
        setIsEveryoneSelected(true);
        setSelectedTeams([]);
        setSelectedPrograms([]);
        setSelectedDivisions([]);
        setSelectedUsers([]);
        setSelectedRoles([]);
      } else {
        setIsEveryoneSelected(false);
        setSelectedTeams((event.assignTo?.teams || []).map(String));
        setSelectedPrograms((event.assignTo?.programs || []).map(String));
        setSelectedDivisions((event.assignTo?.divisions || []).map(String));
        setSelectedUsers((event.assignTo?.users || []).map(String));
        setSelectedRoles(event.assignTo?.roles || []);
      }
      setExpandedSections({});

      if (event.isRecurring || event.recurringType) {
        setIsRecurring(true);
        const freq =
          event.recurringType && ["daily", "weekly", "biweekly", "monthly"].includes(event.recurringType)
            ? (event.recurringType as "daily" | "weekly" | "biweekly" | "monthly")
            : "weekly";
        setRecurrenceFrequency(freq);
        if (freq === "weekly" || freq === "biweekly") {
          const startDate = new Date(ensureUtcString(event.startTime));
          if (!isNaN(startDate.getTime())) {
            const localDayStr = new Intl.DateTimeFormat("en-US", {
              timeZone: etz,
              weekday: "short",
            }).format(startDate);
            const dayMap: Record<string, number> = {
              Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
            };
            const d = dayMap[localDayStr];
            setRecurrenceDays(d !== undefined ? [d] : []);
          }
        } else {
          setRecurrenceDays([]);
        }
        setRecurrenceCount(4);
        if (event.recurringEndDate) {
          setRecurrenceEndType("date");
          const endDateStr =
            typeof event.recurringEndDate === "string" && !event.recurringEndDate.includes("T")
              ? event.recurringEndDate.split(" ")[0]
              : event.recurringEndDate.split("T")[0];
          setRecurrenceEndDate(endDateStr);
        } else {
          setRecurrenceEndType("count");
          setRecurrenceEndDate("");
        }
      } else {
        setIsRecurring(false);
        setRecurrenceFrequency("weekly");
        setRecurrenceCount(4);
        setRecurrenceDays([]);
        setRecurrenceEndType("count");
        setRecurrenceEndDate("");
      }

      form.reset({
        type: (event.eventType || event.type || "practice") as any,
        description: event.description || "",
        events: [
          {
            title: `${event.title} (Copy)`,
            startTime: localStart,
            endTime: localEnd,
            location: event.location || "",
            meetingLink: event.meetingLink || "",
            latitude: event.latitude,
            longitude: event.longitude,
            facilityId: event.facilityId ?? null,
            courtName: event.courtName || "",
            locationType: event.location === "Online" ? "online" : "physical",
          },
        ],
      });
    }
  }, [isOpen, duplicatingEvent]);

  const handleAddRow = () => {
    const rows = form.getValues("events");
    const last = rows[rows.length - 1];
    const next: EventRowValue = {
      title: last?.title || "",
      startTime: last?.startTime ? shiftDatetimeByDays(last.startTime, 1) : "",
      endTime: last?.endTime ? shiftDatetimeByDays(last.endTime, 1) : "",
      location: last?.location || "",
      meetingLink: last?.meetingLink || "",
      latitude: last?.latitude,
      longitude: last?.longitude,
      facilityId: last?.facilityId ?? null,
      courtName: last?.courtName || "",
      locationType: last?.locationType || "physical",
    };
    append(next);
  };

  const createEvent = useMutation({
    mutationFn: async (data: CreateEventFormValues) => {
      const { type, description, events: rows } = data;

      let assignTo: any = {};
      let visibility: any = {};

      if (isEveryoneSelected) {
        assignTo = { roles: ["player", "coach", "parent", "admin"] };
        visibility = { roles: ["player", "coach", "parent", "admin"] };
      } else {
        const hasAny =
          selectedTeams.length > 0 ||
          selectedPrograms.length > 0 ||
          selectedDivisions.length > 0 ||
          selectedUsers.length > 0 ||
          selectedRoles.length > 0;
        if (!hasAny) {
          toast({ title: "Select Audience", description: "Please select at least one audience category or choose Everyone.", variant: "destructive" });
          return;
        }
        if (selectedTeams.length > 0) assignTo.teams = selectedTeams.map(String);
        if (selectedPrograms.length > 0) assignTo.programs = selectedPrograms.map(String);
        if (selectedDivisions.length > 0) assignTo.divisions = selectedDivisions.map(String);
        if (selectedUsers.length > 0) assignTo.users = selectedUsers;
        if (selectedRoles.length > 0) assignTo.roles = selectedRoles;
        visibility = { ...assignTo };
      }

      if (isRecurring) {
        if (
          (recurrenceFrequency === "weekly" || recurrenceFrequency === "biweekly") &&
          recurrenceDays.length === 0
        ) {
          toast({
            title: "Select Days",
            description: "Please select at least one day of the week for recurring events.",
            variant: "destructive",
          });
          return;
        }
        if (recurrenceEndType === "date" && !recurrenceEndDate) {
          toast({
            title: "Select End Date",
            description: "Please select an end date for the recurring events.",
            variant: "destructive",
          });
          return;
        }
      }

      const recurringEndDateISO =
        isRecurring && recurrenceEndType === "date" && recurrenceEndDate
          ? recurrenceEndDate + "T23:59:59Z"
          : null;

      const eventsToCreate: any[] = [];

      for (const row of rows) {
        const naiveStart = row.startTime || "";
        const naiveEnd = row.endTime || "";
        if (!naiveStart.includes("T") || !naiveEnd.includes("T")) {
          toast({ title: "Please set both start and end times for every event row", variant: "destructive" });
          return;
        }

        const utcStartTime = localDatetimeToUTC(naiveStart, eventTimezone);
        const utcEndTime = localDatetimeToUTC(naiveEnd, eventTimezone);

        const basePayload: any = {
          title: row.title,
          startTime: utcStartTime,
          endTime: utcEndTime,
          location: row.locationType === "online" ? "Online" : row.location,
          meetingLink: row.meetingLink || "",
          latitude: row.latitude,
          longitude: row.longitude,
          facilityId: row.facilityId ?? null,
          courtName: row.courtName || "",
          description: description || "",
          eventType: type,
          organizationId: organization.id,
          assignTo,
          visibility,
          playerRsvpEnabled,
          timezone: eventTimezone,
          isRecurring,
          recurringType: isRecurring ? recurrenceFrequency : null,
          recurringEndDate: isRecurring ? recurringEndDateISO : null,
        };

        eventsToCreate.push(basePayload);

        if (!isRecurring) continue;

        const [startDatePart, startTimePart] = naiveStart.split("T");
        const [, endTimePart] = naiveEnd.split("T");
        const [startHour, startMinute] = startTimePart.split(":").map(Number);
        const [endHour, endMinute] = endTimePart.split(":").map(Number);
        const [sYear, sMonth, sDay] = startDatePart.split("-").map(Number);
        let durationMinutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
        if (durationMinutes <= 0) durationMinutes += 24 * 60;

        let maxEndDate: Date | null = null;
        if (recurrenceEndType === "date" && recurrenceEndDate) {
          const [year, month, day] = recurrenceEndDate.split("-").map(Number);
          maxEndDate = new Date(year, month - 1, day, 23, 59, 59, 999);
        }
        const maxAdditional =
          recurrenceEndType === "count" ? Math.max(recurrenceCount - 1, 0) : 999;

        const pad = (n: number) => String(n).padStart(2, "0");
        const makeOccurrence = (y: number, m: number, d: number) => {
          const naiveS = `${y}-${pad(m)}-${pad(d)}T${pad(startHour)}:${pad(startMinute)}`;
          const endDateObj = new Date(y, m - 1, d, startHour, startMinute);
          endDateObj.setMinutes(endDateObj.getMinutes() + durationMinutes);
          const naiveE = `${endDateObj.getFullYear()}-${pad(endDateObj.getMonth() + 1)}-${pad(endDateObj.getDate())}T${pad(endDateObj.getHours())}:${pad(endDateObj.getMinutes())}`;
          return {
            ...basePayload,
            startTime: localDatetimeToUTC(naiveS, eventTimezone),
            endTime: localDatetimeToUTC(naiveE, eventTimezone),
          };
        };

        const startDateStr = `${sYear}-${pad(sMonth)}-${pad(sDay)}`;

        if (
          (recurrenceFrequency === "weekly" || recurrenceFrequency === "biweekly") &&
          recurrenceDays.length > 0
        ) {
          const weekInterval = recurrenceFrequency === "biweekly" ? 2 : 1;
          let curWeekStart = new Date(sYear, sMonth - 1, sDay);
          curWeekStart.setDate(curWeekStart.getDate() - curWeekStart.getDay());

          let eventCount = 0;
          const maxIterations = 520;
          let iterations = 0;
          let shouldStop = false;

          while (eventCount < maxAdditional && iterations < maxIterations && !shouldStop) {
            for (const dayOfWeek of [...recurrenceDays].sort((a, b) => a - b)) {
              if (eventCount >= maxAdditional) { shouldStop = true; break; }
              const eventDate = new Date(curWeekStart);
              eventDate.setDate(curWeekStart.getDate() + dayOfWeek);
              const startDateRef = new Date(sYear, sMonth - 1, sDay);
              if (eventDate <= startDateRef) continue;
              if (maxEndDate && eventDate > maxEndDate) { shouldStop = true; break; }
              const occDateStr = `${eventDate.getFullYear()}-${pad(eventDate.getMonth() + 1)}-${pad(eventDate.getDate())}`;
              if (occDateStr === startDateStr) continue;
              eventsToCreate.push(makeOccurrence(eventDate.getFullYear(), eventDate.getMonth() + 1, eventDate.getDate()));
              eventCount++;
            }
            curWeekStart.setDate(curWeekStart.getDate() + 7 * weekInterval);
            iterations++;
          }
        } else {
          for (let i = 1; i <= maxAdditional; i++) {
            const d = new Date(sYear, sMonth - 1, sDay);
            if (recurrenceFrequency === "daily") d.setDate(d.getDate() + i);
            else if (recurrenceFrequency === "weekly") d.setDate(d.getDate() + i * 7);
            else if (recurrenceFrequency === "biweekly") d.setDate(d.getDate() + i * 14);
            else if (recurrenceFrequency === "monthly") d.setMonth(d.getMonth() + i);
            if (maxEndDate && d > maxEndDate) break;
            eventsToCreate.push(makeOccurrence(d.getFullYear(), d.getMonth() + 1, d.getDate()));
          }
        }
      }

      const wasTruncated =
        isRecurring && recurrenceEndType === "date" && eventsToCreate.length >= 1000;

      if (eventsToCreate.length === 1) {
        const newEvent = await apiRequest("POST", "/api/events", eventsToCreate[0]);
        if (eventWindows.length > 0) {
          for (const window of eventWindows) {
            try {
              await apiRequest("POST", "/api/event-windows", {
                ...window,
                eventId: parseInt(newEvent.id),
              });
            } catch (windowErr) {
              console.error("Failed to create event window:", windowErr);
            }
          }
        }
        return { events: [newEvent], wasTruncated: false, count: 1, totalAttempted: 1, errors: [] };
      }

      const batchResult = await apiRequest("POST", "/api/events/batch", {
        events: eventsToCreate,
        eventWindows: eventWindows.length > 0 ? eventWindows : undefined,
      });

      const createdEvents = batchResult.events || [];
      if (createdEvents.length === 0) {
        throw new Error("Failed to create events");
      }

      return { events: createdEvents, wasTruncated, count: createdEvents.length, totalAttempted: eventsToCreate.length, errors: [] };
    },
    onSuccess: (data: any) => {
      const newEvents = data?.events || [];
      if (newEvents.length > 0) {
        queryClient.setQueryData(["/api/events"], (old: any[] | undefined) => {
          return old ? [...old, ...newEvents] : newEvents;
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      const count = data?.count || 1;
      const totalAttempted = data?.totalAttempted || count;
      const wasTruncated = data?.wasTruncated;
      const errors = data?.errors || [];

      if (wasTruncated) {
        toast({
          title: `${count} events created (date range limit reached)`,
          description: "The maximum of 1000 events was reached.",
          variant: "destructive",
        });
      } else if (errors.length > 0 && count > 0) {
        toast({
          title: `${count} of ${totalAttempted} events created`,
          description: `Some events failed: ${errors[0]}`,
          variant: "destructive",
        });
      } else {
        toast({ title: count > 1 ? `${count} events created successfully` : "Event created successfully" });
      }

      onOpenChange(false);
      resetAll();
    },
    onError: (error: any) => {
      console.error("Event creation error:", error);
      toast({
        title: "Failed to create event",
        description: error?.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    },
  });

  const addFacility = useMutation({
    mutationFn: async () => {
      if (!newFacilityName.trim() || !newFacilityAddress.trim()) return;
      return apiRequest("POST", "/api/facilities", {
        name: newFacilityName.trim(),
        address: newFacilityAddress.trim(),
        latitude: parseFloat(newFacilityLat) || 0,
        longitude: parseFloat(newFacilityLng) || 0,
        isActive: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facilities"] });
      toast({ title: "Facility added" });
      setNewFacilityName("");
      setNewFacilityAddress("");
      setNewFacilityLat("");
      setNewFacilityLng("");
    },
    onError: () => {
      toast({ title: "Failed to add facility", variant: "destructive" });
    },
  });

  const deleteFacility = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/facilities/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facilities"] });
      const rows = form.getValues("events");
      rows.forEach((row, idx) => {
        if (row.facilityId !== null && row.facilityId !== undefined) {
          const stillExists = facilities.find((f: any) => f.id === row.facilityId);
          if (!stillExists) {
            form.setValue(`events.${idx}.facilityId` as const, null);
          }
        }
      });
      toast({ title: "Facility deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete facility", variant: "destructive" });
    },
  });

  const watchedRows = form.watch("events");
  const firstRow = watchedRows?.[0];
  const isSubmitting = createEvent.isPending;

  const missingFields: string[] = [];
  if (!firstRow?.title) missingFields.push("title");
  if (watchedRows?.some((r) => !r.startTime || !r.endTime)) missingFields.push("dates");
  if (watchedRows?.some((r) => !r.location)) missingFields.push("location");

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) resetAll();
      }}
    >
      <DialogTrigger asChild>
        <Button size="icon" title="Create Event" data-testid="button-create-event">
          <Plus className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="sr-only">
          <DialogTitle>Create New Event</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => {
              console.log("📍 Creating event with data:", data);
              createEvent.mutate(data);
            })}
            className="flex flex-col flex-1 min-h-0"
          >
          <div className="flex-1 overflow-y-auto space-y-5 pr-1">
            <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider bg-teal-50 text-teal-700 rounded-full border border-teal-200">
              {fields.length > 1 ? `New Events (${fields.length})` : "New Event"}
            </span>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Left Column */}
              <div className="lg:col-span-3 space-y-5">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Event Type
                      </label>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-event-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="game">Game</SelectItem>
                          <SelectItem value="tournament">Tournament</SelectItem>
                          <SelectItem value="camp">Camp</SelectItem>
                          <SelectItem value="exhibition">Exhibition</SelectItem>
                          <SelectItem value="practice">Practice</SelectItem>
                          <SelectItem value="skills">Skills</SelectItem>
                          <SelectItem value="workshop">Workshop</SelectItem>
                          <SelectItem value="talk">Talk</SelectItem>
                          <SelectItem value="combine">Combine</SelectItem>
                          <SelectItem value="training">Training</SelectItem>
                          <SelectItem value="meeting">Meeting</SelectItem>
                          <SelectItem value="course">Course</SelectItem>
                          <SelectItem value="tryout">Tryout</SelectItem>
                          <SelectItem value="skills-assessment">Skills Assessment</SelectItem>
                          <SelectItem value="team-building">Team Building</SelectItem>
                          <SelectItem value="parent-meeting">Parent Meeting</SelectItem>
                          <SelectItem value="equipment-pickup">Equipment Pickup</SelectItem>
                          <SelectItem value="photo-day">Photo Day</SelectItem>
                          <SelectItem value="award-ceremony">Award Ceremony</SelectItem>
                          <SelectItem value="fnh">FNH</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Timezone (applies to every event)
                  </label>
                  <Select value={eventTimezone} onValueChange={setEventTimezone}>
                    <SelectTrigger className="h-9" data-testid="select-event-timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONE_OPTIONS.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <EventRowEditor
                      key={field.id}
                      index={index}
                      total={fields.length}
                      form={form}
                      facilities={facilities}
                      showFacilityManager={showFacilityManager && index === 0}
                      setShowFacilityManager={setShowFacilityManager}
                      newFacilityName={newFacilityName}
                      setNewFacilityName={setNewFacilityName}
                      newFacilityAddress={newFacilityAddress}
                      setNewFacilityAddress={setNewFacilityAddress}
                      newFacilityLat={newFacilityLat}
                      setNewFacilityLat={setNewFacilityLat}
                      newFacilityLng={newFacilityLng}
                      setNewFacilityLng={setNewFacilityLng}
                      addFacilityPending={addFacility.isPending}
                      onAddFacility={() => addFacility.mutate()}
                      onDeleteFacility={(id) => {
                        if (confirm("Delete this facility?")) deleteFacility.mutate(id);
                      }}
                      onRemove={() => remove(index)}
                    />
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleAddRow}
                    disabled={isSubmitting}
                    data-testid="button-add-event-row"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add another event
                  </Button>

                  {isRecurring && fields.length > 1 && (
                    <p className="text-xs text-muted-foreground italic">
                      Recurring is on — each of the {fields.length} event rows will generate its own series.
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Audience
                  </label>

                  <button
                    type="button"
                    className={`w-full px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isEveryoneSelected
                        ? "bg-blue-600 text-white"
                        : "border bg-background hover:bg-muted"
                    }`}
                    onClick={() => {
                      if (!isEveryoneSelected) {
                        setIsEveryoneSelected(true);
                        setSelectedTeams([]);
                        setSelectedPrograms([]);
                        setSelectedDivisions([]);
                        setSelectedUsers([]);
                        setSelectedRoles([]);
                        setExpandedSections({});
                      }
                    }}
                    data-testid="audience-everyone-toggle"
                  >
                    Everyone
                  </button>

                  {!isEveryoneSelected && (
                    <div className="space-y-2">
                      {[
                        { key: "teams", label: "Teams", count: selectedTeams.length },
                        { key: "programs", label: "Programs", count: selectedPrograms.length },
                        { key: "divisions", label: "Divisions", count: selectedDivisions.length },
                        { key: "roles", label: "Roles", count: selectedRoles.length },
                        { key: "users", label: "Users", count: selectedUsers.length },
                      ].map(({ key, label, count }) => (
                        <div key={key} className="border rounded-md overflow-hidden">
                          <button
                            type="button"
                            className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
                            onClick={() =>
                              setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))
                            }
                          >
                            <span className="flex items-center gap-2">
                              {expandedSections[key] ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                              {label}
                            </span>
                            {count > 0 && (
                              <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-2 py-0.5 rounded-full font-semibold">
                                {count} selected
                              </span>
                            )}
                          </button>

                          {expandedSections[key] && (
                            <div className="border-t p-3 max-h-48 overflow-y-auto space-y-2">
                              {key === "teams" && teams.map((team: any) => (
                                <div key={team.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={selectedTeams.includes(String(team.id))}
                                    onCheckedChange={(checked) => {
                                      setIsEveryoneSelected(false);
                                      if (checked) setSelectedTeams([...selectedTeams, String(team.id)]);
                                      else setSelectedTeams(selectedTeams.filter((id) => id !== String(team.id)));
                                    }}
                                    data-testid={`checkbox-team-${team.id}`}
                                  />
                                  <label className="text-sm cursor-pointer">
                                    {team.name}{team.programType ? ` (${team.programType})` : ""}
                                  </label>
                                </div>
                              ))}

                              {key === "programs" && programs
                                .filter((p: any) => p.isActive && p.productCategory === "service")
                                .map((program: any) => (
                                  <div key={program.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      checked={selectedPrograms.includes(String(program.id))}
                                      onCheckedChange={(checked) => {
                                        setIsEveryoneSelected(false);
                                        if (checked) setSelectedPrograms([...selectedPrograms, String(program.id)]);
                                        else setSelectedPrograms(selectedPrograms.filter((id) => id !== String(program.id)));
                                      }}
                                      data-testid={`checkbox-program-${program.id}`}
                                    />
                                    <label className="text-sm cursor-pointer">{program.name}</label>
                                  </div>
                                ))}

                              {key === "divisions" && divisions
                                .filter((d: any) => d.isActive)
                                .map((division: any) => (
                                  <div key={division.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      checked={selectedDivisions.includes(String(division.id))}
                                      onCheckedChange={(checked) => {
                                        setIsEveryoneSelected(false);
                                        if (checked) setSelectedDivisions([...selectedDivisions, String(division.id)]);
                                        else setSelectedDivisions(selectedDivisions.filter((id) => id !== String(division.id)));
                                      }}
                                      data-testid={`checkbox-division-${division.id}`}
                                    />
                                    <label className="text-sm cursor-pointer">
                                      {division.name}{division.ageRange ? ` (${division.ageRange})` : ""}
                                    </label>
                                  </div>
                                ))}

                              {key === "roles" && ["player", "parent", "coach", "admin"].map((role) => (
                                <div key={role} className="flex items-center space-x-2">
                                  <Checkbox
                                    checked={selectedRoles.includes(role)}
                                    onCheckedChange={(checked) => {
                                      setIsEveryoneSelected(false);
                                      if (checked) setSelectedRoles([...selectedRoles, role]);
                                      else setSelectedRoles(selectedRoles.filter((r) => r !== role));
                                    }}
                                    data-testid={`checkbox-role-${role}`}
                                  />
                                  <label className="text-sm cursor-pointer capitalize">{role}</label>
                                </div>
                              ))}

                              {key === "users" && (
                                <>
                                  <Input
                                    placeholder="Search by name, email, or role..."
                                    value={userSearch}
                                    onChange={(e) => setUserSearch(e.target.value)}
                                    className="mb-2"
                                  />
                                  {allUsers
                                    .filter((u: any) => u.isActive)
                                    .filter((user: any) => {
                                      const q = userSearch.toLowerCase();
                                      if (!q) return true;
                                      return (
                                        (user.firstName || "").toLowerCase().includes(q) ||
                                        (user.lastName || "").toLowerCase().includes(q) ||
                                        (user.email || "").toLowerCase().includes(q) ||
                                        (user.role || "").toLowerCase().includes(q)
                                      );
                                    })
                                    .map((user: any) => (
                                      <div key={user.id} className="flex items-center space-x-2">
                                        <Checkbox
                                          checked={selectedUsers.includes(String(user.id))}
                                          onCheckedChange={(checked) => {
                                            setIsEveryoneSelected(false);
                                            if (checked) setSelectedUsers([...selectedUsers, String(user.id)]);
                                            else setSelectedUsers(selectedUsers.filter((id) => id !== String(user.id)));
                                          }}
                                          data-testid={`checkbox-user-${user.id}`}
                                        />
                                        <label className="text-sm cursor-pointer">
                                          {user.firstName} {user.lastName} - {user.role} ({user.email})
                                        </label>
                                      </div>
                                    ))}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {!isEveryoneSelected && (
                    <p className="text-xs text-muted-foreground">
                      {(() => {
                        const parts: string[] = [];
                        if (selectedTeams.length > 0) parts.push(`${selectedTeams.length} team${selectedTeams.length !== 1 ? "s" : ""}`);
                        if (selectedPrograms.length > 0) parts.push(`${selectedPrograms.length} program${selectedPrograms.length !== 1 ? "s" : ""}`);
                        if (selectedDivisions.length > 0) parts.push(`${selectedDivisions.length} division${selectedDivisions.length !== 1 ? "s" : ""}`);
                        if (selectedRoles.length > 0) parts.push(`${selectedRoles.length} role${selectedRoles.length !== 1 ? "s" : ""}`);
                        if (selectedUsers.length > 0) parts.push(`${selectedUsers.length} user${selectedUsers.length !== 1 ? "s" : ""}`);
                        return parts.length > 0 ? parts.join(", ") + " selected" : "No specific audience selected — use Everyone button above to reset";
                      })()}
                    </p>
                  )}

                  {isEveryoneSelected && (
                    <button
                      type="button"
                      className="text-xs text-blue-600 hover:underline"
                      onClick={() => setIsEveryoneSelected(false)}
                    >
                      + Target specific teams, programs, or roles instead
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Description
                  </label>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Optional notes or instructions for attendees..."
                            className="min-h-[80px]"
                            data-testid="input-event-description"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="lg:col-span-2 space-y-5">
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="recurring-toggle" className="font-medium cursor-pointer">
                      Recurring event
                    </Label>
                    <Switch
                      id="recurring-toggle"
                      checked={isRecurring}
                      onCheckedChange={setIsRecurring}
                      data-testid="switch-recurring"
                    />
                  </div>

                  {isRecurring && (
                    <div className="space-y-4 pt-2">
                      {fields.length > 1 && (
                        <p className="text-xs text-muted-foreground bg-muted/40 border rounded p-2">
                          Recurrence applies independently to each of the {fields.length} event rows.
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: "daily", label: "Daily" },
                          { value: "weekly", label: "Weekly" },
                          { value: "biweekly", label: "2 Weeks" },
                          { value: "monthly", label: "Monthly" },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                              recurrenceFrequency === opt.value
                                ? "bg-primary text-primary-foreground"
                                : "border bg-background hover:bg-muted"
                            }`}
                            onClick={() => {
                              setRecurrenceFrequency(opt.value as any);
                              if (opt.value !== "weekly" && opt.value !== "biweekly") {
                                setRecurrenceDays([]);
                              }
                            }}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      {(recurrenceFrequency === "weekly" || recurrenceFrequency === "biweekly") && (
                        <div className="flex flex-wrap gap-1">
                          {[
                            { day: 0, label: "Su" },
                            { day: 1, label: "Mo" },
                            { day: 2, label: "Tu" },
                            { day: 3, label: "We" },
                            { day: 4, label: "Th" },
                            { day: 5, label: "Fr" },
                            { day: 6, label: "Sa" },
                          ].map(({ day, label }) => (
                            <button
                              key={day}
                              type="button"
                              className={`w-9 h-9 rounded text-xs font-medium transition-colors ${
                                recurrenceDays.includes(day)
                                  ? "bg-blue-600 text-white"
                                  : "border bg-background text-muted-foreground hover:bg-muted"
                              }`}
                              onClick={() => {
                                setRecurrenceDays(
                                  recurrenceDays.includes(day)
                                    ? recurrenceDays.filter((d) => d !== day)
                                    : [...recurrenceDays, day]
                                );
                              }}
                              data-testid={`btn-day-${["sun", "mon", "tue", "wed", "thu", "fri", "sat"][day]}`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${recurrenceEndType === "count" ? "bg-primary text-primary-foreground" : "border bg-background hover:bg-muted"}`}
                          onClick={() => setRecurrenceEndType("count")}
                        >
                          After # events
                        </button>
                        <button
                          type="button"
                          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${recurrenceEndType === "date" ? "bg-primary text-primary-foreground" : "border bg-background hover:bg-muted"}`}
                          onClick={() => setRecurrenceEndType("date")}
                        >
                          On date
                        </button>
                      </div>

                      {recurrenceEndType === "count" ? (
                        <Select
                          value={String(recurrenceCount)}
                          onValueChange={(value) => setRecurrenceCount(parseInt(value))}
                        >
                          <SelectTrigger data-testid="select-recurrence-count">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[2, 3, 4, 5, 6, 7, 8, 10, 12, 16, 20, 24, 30, 40, 52].map((count) => (
                              <SelectItem key={count} value={String(count)}>
                                {count} events
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="space-y-2">
                          <Input
                            type="date"
                            value={recurrenceEndDate}
                            onChange={(e) => setRecurrenceEndDate(e.target.value)}
                            data-testid="input-recurrence-end-date"
                          />
                          <p className="text-xs text-muted-foreground">
                            Events will be created until this date
                          </p>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground border-t pt-2">
                        {recurrenceDays.length > 0 ? (
                          <>
                            Repeats{" "}
                            {recurrenceDays
                              .map((d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d])
                              .join(", ")}{" "}
                            {recurrenceFrequency === "biweekly" ? "every 2 weeks" : "weekly"}
                            {recurrenceEndType === "count"
                              ? ` — ${recurrenceCount} total`
                              : recurrenceEndDate
                              ? ` until ${new Date(recurrenceEndDate).toLocaleDateString()}`
                              : ""}
                          </>
                        ) : (
                          <>
                            Repeats{" "}
                            {recurrenceFrequency === "daily"
                              ? "every day"
                              : recurrenceFrequency === "weekly"
                              ? "every week"
                              : recurrenceFrequency === "biweekly"
                              ? "every 2 weeks"
                              : "every month"}
                            {recurrenceEndType === "count"
                              ? ` — ${recurrenceCount} total`
                              : recurrenceEndDate
                              ? ` until ${new Date(recurrenceEndDate).toLocaleDateString()}`
                              : ""}
                          </>
                        )}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="player-rsvp-toggle" className="font-medium cursor-pointer">
                      Player self-RSVP
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {playerRsvpEnabled
                        ? "Players can RSVP themselves"
                        : "Only parent/guardian can RSVP"}
                    </p>
                  </div>
                  <Switch
                    id="player-rsvp-toggle"
                    checked={playerRsvpEnabled}
                    onCheckedChange={setPlayerRsvpEnabled}
                    data-testid="switch-player-rsvp"
                  />
                </div>

                <EventWindowsConfigurator
                  eventStartTime={firstRow?.startTime ? new Date(firstRow.startTime) : undefined}
                  windows={eventWindows}
                  onChange={setEventWindows}
                />
              </div>
            </div>

            </div>

            <div className="flex items-center justify-between border-t pt-4 shrink-0 bg-background">
              <p className="text-sm text-muted-foreground">
                {missingFields.length > 0 && `Missing: ${Array.from(new Set(missingFields)).join(", ")}`}
              </p>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || missingFields.length > 0}
                  data-testid="button-submit-event"
                >
                  {isSubmitting
                    ? "Creating..."
                    : fields.length > 1
                    ? `Create ${fields.length} Events`
                    : "Create Event"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface EventRowEditorProps {
  index: number;
  total: number;
  form: UseFormReturn<CreateEventFormValues>;
  facilities: any[];
  showFacilityManager: boolean;
  setShowFacilityManager: (v: boolean) => void;
  newFacilityName: string;
  setNewFacilityName: (v: string) => void;
  newFacilityAddress: string;
  setNewFacilityAddress: (v: string) => void;
  newFacilityLat: string;
  setNewFacilityLat: (v: string) => void;
  newFacilityLng: string;
  setNewFacilityLng: (v: string) => void;
  addFacilityPending: boolean;
  onAddFacility: () => void;
  onDeleteFacility: (id: number) => void;
  onRemove: () => void;
}

function EventRowEditor({
  index,
  total,
  form,
  facilities,
  showFacilityManager,
  setShowFacilityManager,
  newFacilityName,
  setNewFacilityName,
  newFacilityAddress,
  setNewFacilityAddress,
  newFacilityLat,
  setNewFacilityLat,
  newFacilityLng,
  setNewFacilityLng,
  addFacilityPending,
  onAddFacility,
  onDeleteFacility,
  onRemove,
}: EventRowEditorProps) {
  const watchedStart = form.watch(`events.${index}.startTime`) ?? "";
  const watchedEnd = form.watch(`events.${index}.endTime`) ?? "";
  const watchedFacilityId = form.watch(`events.${index}.facilityId`);
  const watchedLocationType = form.watch(`events.${index}.locationType`);
  const watchedCourtName = form.watch(`events.${index}.courtName`) ?? "";

  return (
    <div className={`border rounded-lg p-4 space-y-4 ${total > 1 ? "bg-muted/20" : ""}`} data-testid={`event-row-${index}`}>
      {total > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Event {index + 1}
          </span>
          <button
            type="button"
            onClick={onRemove}
            className="text-destructive hover:text-destructive/80 text-xs flex items-center gap-1"
            data-testid={`button-remove-row-${index}`}
          >
            <X className="w-3.5 h-3.5" />
            Remove
          </button>
        </div>
      )}

      <FormField
        control={form.control}
        name={`events.${index}.title`}
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input
                {...field}
                placeholder="Event title..."
                className="text-lg h-12"
                data-testid={`input-event-title-${index}`}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Date &amp; Time
        </label>
        <DateTimeRangePicker
          startValue={watchedStart || ""}
          endValue={watchedEnd || ""}
          onStartChange={(v) => form.setValue(`events.${index}.startTime`, v, { shouldValidate: true })}
          onEndChange={(v) => form.setValue(`events.${index}.endTime`, v, { shouldValidate: true })}
        />
        <FormField
          control={form.control}
          name={`events.${index}.startTime`}
          render={() => <FormMessage />}
        />
        <FormField
          control={form.control}
          name={`events.${index}.endTime`}
          render={() => <FormMessage />}
        />
      </div>

      <div className="space-y-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Location
        </label>
        <div className="flex rounded-lg overflow-hidden w-fit border">
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium transition-colors ${watchedLocationType === "physical" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
            onClick={() => {
              form.setValue(`events.${index}.locationType`, "physical");
              form.setValue(`events.${index}.location`, "");
              form.setValue(`events.${index}.meetingLink`, "");
              form.setValue(`events.${index}.latitude`, undefined);
              form.setValue(`events.${index}.longitude`, undefined);
            }}
          >
            Physical
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium transition-colors ${watchedLocationType === "online" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
            onClick={() => {
              form.setValue(`events.${index}.locationType`, "online");
              form.setValue(`events.${index}.location`, "Online", { shouldValidate: true });
              form.setValue(`events.${index}.latitude`, undefined);
              form.setValue(`events.${index}.longitude`, undefined);
            }}
          >
            Online
          </button>
        </div>

        {watchedLocationType === "physical" ? (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">Facility</label>
                {index === 0 && (
                  <button
                    type="button"
                    onClick={() => setShowFacilityManager(!showFacilityManager)}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <Settings2 className="w-3 h-3" />
                    {showFacilityManager ? "Done" : "Manage"}
                  </button>
                )}
              </div>

              {!showFacilityManager ? (
                <Select
                  value={watchedFacilityId ? String(watchedFacilityId) : "none"}
                  onValueChange={(value) => {
                    if (value === "none") {
                      form.setValue(`events.${index}.facilityId`, null);
                      form.setValue(`events.${index}.location`, "");
                      form.setValue(`events.${index}.latitude`, undefined);
                      form.setValue(`events.${index}.longitude`, undefined);
                    } else {
                      const fac = facilities.find((f: any) => String(f.id) === value);
                      if (fac) {
                        form.setValue(`events.${index}.facilityId`, fac.id);
                        form.setValue(`events.${index}.location`, fac.address, { shouldValidate: true });
                        form.setValue(`events.${index}.latitude`, fac.latitude);
                        form.setValue(`events.${index}.longitude`, fac.longitude);
                      }
                    }
                  }}
                >
                  <SelectTrigger data-testid={`select-event-facility-${index}`}>
                    <SelectValue placeholder="Select a saved facility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (enter manually)</SelectItem>
                    {facilities
                      .filter((f: any) => f.isActive !== false)
                      .map((f: any) => (
                        <SelectItem key={f.id} value={String(f.id)}>
                          {f.name} — {f.address}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                  <div className="space-y-2">
                    {facilities.filter((f: any) => f.isActive !== false).length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">No facilities yet</p>
                    ) : (
                      facilities.filter((f: any) => f.isActive !== false).map((f: any) => (
                        <div key={f.id} className="flex items-center justify-between gap-2 text-sm bg-background rounded px-3 py-2 border">
                          <div className="min-w-0 flex-1">
                            <span className="font-medium">{f.name}</span>
                            <span className="text-muted-foreground ml-1 text-xs truncate">— {f.address}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => onDeleteFacility(f.id)}
                            className="text-destructive hover:text-destructive/80 shrink-0 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="border-t pt-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Add New Facility</p>
                    <Input
                      placeholder="Facility name (e.g. Main Arena)"
                      value={newFacilityName}
                      onChange={(e) => setNewFacilityName(e.target.value)}
                      className="h-8 text-sm"
                    />
                    <LocationSearch
                      value={newFacilityAddress}
                      onLocationSelect={(location) => {
                        setNewFacilityAddress(location.name);
                        setNewFacilityLat(String(location.lat ?? ""));
                        setNewFacilityLng(String(location.lng ?? ""));
                      }}
                      placeholder="Search venue or address..."
                      className="w-full"
                    />
                    {newFacilityAddress && (
                      <p className="text-xs text-muted-foreground truncate">
                        {newFacilityAddress}
                        {newFacilityLat && newFacilityLng && (
                          <span className="ml-1 text-muted-foreground/60">
                            ({parseFloat(newFacilityLat).toFixed(4)}, {parseFloat(newFacilityLng).toFixed(4)})
                          </span>
                        )}
                      </p>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      className="w-full"
                      disabled={!newFacilityName.trim() || !newFacilityAddress.trim() || addFacilityPending}
                      onClick={onAddFacility}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      {addFacilityPending ? "Adding..." : "Add Facility"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            {watchedFacilityId && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Court / Field</label>
                <Input
                  value={watchedCourtName || ""}
                  onChange={(e) => form.setValue(`events.${index}.courtName`, e.target.value)}
                  placeholder="e.g. Court 3, Gym B, Field A"
                  data-testid={`input-event-court-${index}`}
                />
              </div>
            )}
            <FormField
              control={form.control}
              name={`events.${index}.location`}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <LocationSearch
                      value={field.value || ""}
                      onLocationSelect={(location) => {
                        field.onChange(location.name);
                        form.setValue(`events.${index}.latitude`, location.lat ?? undefined);
                        form.setValue(`events.${index}.longitude`, location.lng ?? undefined);
                        form.setValue(`events.${index}.facilityId`, null);
                      }}
                      placeholder="Search for a venue or address..."
                      className="w-full"
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    {watchedFacilityId
                      ? "Facility address auto-filled. Override with manual search if needed."
                      : "Search and select a location — enables GPS check-in geo-fencing"}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        ) : (
          <FormField
            control={form.control}
            name={`events.${index}.meetingLink`}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="https://zoom.us/j/..."
                    data-testid={`input-event-meeting-link-${index}`}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Paste a Zoom, Google Meet, or other meeting link
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>
    </div>
  );
}
