import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
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
import { Plus } from "lucide-react";
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

const createEventSchema = z.object({
  title: z.string().min(1, "Event title is required"),
  type: z.enum([
    "game", "tournament", "camp", "exhibition", "practice", "skills",
    "workshop", "talk", "combine", "training", "meeting", "course",
    "tryout", "skills-assessment", "team-building", "parent-meeting",
    "equipment-pickup", "photo-day", "award-ceremony", "fnh",
  ]),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  location: z.string().min(1, "Location is required"),
  meetingLink: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  description: z.string().optional(),
  targetType: z.enum(["all", "user", "team", "division", "program", "role"]),
  facilityId: z.number().nullable().optional(),
  courtName: z.string().optional(),
});

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
  const [locationType, setLocationType] = useState<"physical" | "online">("physical");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [eventWindows, setEventWindows] = useState<Partial<EventWindow>[]>([]);

  const { data: allUsers = [] } = useQuery<any[]>({ queryKey: ["/api/users"] });
  const { data: divisions = [] } = useQuery<any[]>({ queryKey: ["/api/divisions"] });

  const form = useForm({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      title: "",
      type: "practice" as const,
      startTime: "",
      endTime: "",
      location: "",
      meetingLink: "",
      latitude: undefined,
      longitude: undefined,
      description: "",
      targetType: "all" as const,
      facilityId: null,
      courtName: "",
    },
  });

  const resetAll = () => {
    form.reset({
      title: "",
      type: "practice",
      startTime: "",
      endTime: "",
      location: "",
      meetingLink: "",
      latitude: undefined,
      longitude: undefined,
      description: "",
      targetType: "all",
      facilityId: null,
      courtName: "",
    });
    setEventWindows([]);
    setSelectedUsers([]);
    setSelectedTeams([]);
    setSelectedDivisions([]);
    setSelectedPrograms([]);
    setSelectedRoles([]);
    setUserSearch("");
    setLocationType("physical");
    setIsRecurring(false);
    setRecurrenceFrequency("weekly");
    setRecurrenceCount(4);
    setRecurrenceDays([]);
    setRecurrenceEndType("count");
    setRecurrenceEndDate("");
    setPlayerRsvpEnabled(true);
    setEventTimezone(getDefaultTimezone());
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
      let targetType = "all";
      if (!hasAllRoles) {
        if (event.scheduleRequestSource && event.assignTo?.users?.length > 0) targetType = "user";
        else if (event.assignTo?.teams?.length > 0) targetType = "team";
        else if (event.assignTo?.programs?.length > 0) targetType = "program";
        else if (event.assignTo?.divisions?.length > 0) targetType = "division";
        else if (event.assignTo?.users?.length > 0) targetType = "user";
        else if (event.assignTo?.roles?.length > 0) targetType = "role";
        else if (event.targetType) targetType = event.targetType;
      }

      setLocationType(event.location === "Online" ? "online" : "physical");
      setEventTimezone(etz);

      if (targetType === "team") setSelectedTeams((event.assignTo?.teams || []).map(String));
      else setSelectedTeams([]);
      if (targetType === "program") setSelectedPrograms((event.assignTo?.programs || []).map(String));
      else setSelectedPrograms([]);
      if (targetType === "division") setSelectedDivisions((event.assignTo?.divisions || []).map(String));
      else setSelectedDivisions([]);
      if (targetType === "user") setSelectedUsers((event.assignTo?.users || []).map(String));
      else setSelectedUsers([]);
      if (targetType === "role") setSelectedRoles(event.assignTo?.roles || []);
      else setSelectedRoles([]);

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
        title: `${event.title} (Copy)`,
        type: (event.eventType || event.type || "practice") as any,
        startTime: localStart,
        endTime: localEnd,
        location: event.location || "",
        meetingLink: event.meetingLink || "",
        latitude: event.latitude,
        longitude: event.longitude,
        description: event.description || "",
        targetType: targetType as any,
      });
    }
  }, [isOpen, duplicatingEvent]);

  const createEvent = useMutation({
    mutationFn: async (data: any) => {
      const { type, targetType, ...rest } = data;

      let assignTo: any = {};
      let visibility: any = {};

      if (targetType === "all") {
        assignTo = { roles: ["player", "coach", "parent", "admin"] };
        visibility = { roles: ["player", "coach", "parent", "admin"] };
      } else if (targetType === "user") {
        if (selectedUsers.length === 0) {
          toast({ title: "Select Users", description: "Please select at least one user.", variant: "destructive" });
          return;
        }
        assignTo = { users: selectedUsers };
        visibility = { users: selectedUsers };
      } else if (targetType === "team") {
        if (selectedTeams.length === 0) {
          toast({ title: "Select Teams", description: "Please select at least one team.", variant: "destructive" });
          return;
        }
        assignTo = { teams: selectedTeams.map(String) };
        visibility = { teams: selectedTeams.map(String) };
      } else if (targetType === "division") {
        if (selectedDivisions.length === 0) {
          toast({ title: "Select Divisions", description: "Please select at least one division.", variant: "destructive" });
          return;
        }
        assignTo = { divisions: selectedDivisions.map(String) };
        visibility = { divisions: selectedDivisions.map(String) };
      } else if (targetType === "program") {
        if (selectedPrograms.length === 0) {
          toast({ title: "Select Programs", description: "Please select at least one program.", variant: "destructive" });
          return;
        }
        assignTo = { programs: selectedPrograms.map(String) };
        visibility = { programs: selectedPrograms.map(String) };
      } else if (targetType === "role") {
        if (selectedRoles.length === 0) {
          toast({ title: "Select Roles", description: "Please select at least one role.", variant: "destructive" });
          return;
        }
        assignTo = { roles: selectedRoles };
        visibility = { roles: selectedRoles };
      }

      console.log("Event form data before submission:", { type, targetType, assignTo, ...rest });
      const utcStartTime = localDatetimeToUTC(rest.startTime, eventTimezone);
      const utcEndTime = localDatetimeToUTC(rest.endTime, eventTimezone);
      const recurringEndDateISO =
        isRecurring && recurrenceEndType === "date" && recurrenceEndDate
          ? recurrenceEndDate + "T23:59:59Z"
          : null;

      const basePayload = {
        ...rest,
        startTime: utcStartTime,
        endTime: utcEndTime,
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

      const eventsToCreate: any[] = [];

      const naiveStart = rest.startTime || "";
      const naiveEnd = rest.endTime || "";

      if (!naiveStart.includes("T") || !naiveEnd.includes("T")) {
        toast({ title: "Please set both start and end times", variant: "destructive" });
        return;
      }

      const [startDatePart, startTimePart] = naiveStart.split("T");
      const [, endTimePart] = naiveEnd.split("T");
      const [startHour, startMinute] = startTimePart.split(":").map(Number);
      const [endHour, endMinute] = endTimePart.split(":").map(Number);
      const [sYear, sMonth, sDay] = startDatePart.split("-").map(Number);

      let durationMinutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
      if (durationMinutes <= 0) durationMinutes += 24 * 60;

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

      eventsToCreate.push(basePayload);

      if (isRecurring) {
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

        const startDateStr = `${sYear}-${String(sMonth).padStart(2, "0")}-${String(sDay).padStart(2, "0")}`;

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
            for (const dayOfWeek of recurrenceDays.sort((a, b) => a - b)) {
              if (eventCount >= maxAdditional) { shouldStop = true; break; }
              const eventDate = new Date(curWeekStart);
              eventDate.setDate(curWeekStart.getDate() + dayOfWeek);
              const startDateRef = new Date(sYear, sMonth - 1, sDay);
              if (eventDate <= startDateRef) continue;
              if (maxEndDate && eventDate > maxEndDate) { shouldStop = true; break; }
              const occDateStr = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, "0")}-${String(eventDate.getDate()).padStart(2, "0")}`;
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

  const watchedTargetType = form.watch("targetType");
  const watchedStartTime = form.watch("startTime");
  const watchedEndTime = form.watch("endTime");
  const watchedTitle = form.watch("title");
  const watchedLocation = form.watch("location");
  const watchedFacilityId = form.watch("facilityId");

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
              New Event
            </span>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Event title..."
                      className="text-lg h-12"
                      data-testid="input-event-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

                <div className="space-y-3">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Date &amp; Time
                  </label>
                  <DateTimeRangePicker
                    startValue={watchedStartTime || ""}
                    endValue={watchedEndTime || ""}
                    onStartChange={(v) => form.setValue("startTime", v, { shouldValidate: true })}
                    onEndChange={(v) => form.setValue("endTime", v, { shouldValidate: true })}
                  />
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Timezone</label>
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
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Location
                  </label>
                  <div className="flex rounded-lg overflow-hidden w-fit border">
                    <button
                      type="button"
                      className={`px-4 py-2 text-sm font-medium transition-colors ${locationType === "physical" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
                      onClick={() => {
                        setLocationType("physical");
                        form.setValue("location", "");
                        form.setValue("meetingLink", "");
                        form.setValue("latitude", undefined as any);
                        form.setValue("longitude", undefined as any);
                      }}
                    >
                      Physical
                    </button>
                    <button
                      type="button"
                      className={`px-4 py-2 text-sm font-medium transition-colors ${locationType === "online" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
                      onClick={() => {
                        setLocationType("online");
                        form.setValue("location", "Online");
                        form.setValue("latitude", undefined as any);
                        form.setValue("longitude", undefined as any);
                      }}
                    >
                      Online
                    </button>
                  </div>

                  {locationType === "physical" ? (
                    <>
                      {facilities.length > 0 && (
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground">Facility</label>
                          <Select
                            value={watchedFacilityId ? String(watchedFacilityId) : "none"}
                            onValueChange={(value) => {
                              if (value === "none") {
                                form.setValue("facilityId", null);
                                form.setValue("location", "");
                                form.setValue("latitude", undefined);
                                form.setValue("longitude", undefined);
                              } else {
                                const fac = facilities.find((f: any) => String(f.id) === value);
                                if (fac) {
                                  form.setValue("facilityId", fac.id);
                                  form.setValue("location", fac.address);
                                  form.setValue("latitude", fac.latitude);
                                  form.setValue("longitude", fac.longitude);
                                }
                              }
                            }}
                          >
                            <SelectTrigger data-testid="select-event-facility">
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
                        </div>
                      )}
                      {watchedFacilityId && (
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground">Court / Field</label>
                          <Input
                            value={form.watch("courtName") || ""}
                            onChange={(e) => form.setValue("courtName", e.target.value)}
                            placeholder="e.g. Court 3, Gym B, Field A"
                            data-testid="input-event-court"
                          />
                        </div>
                      )}
                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <LocationSearch
                                value={field.value || ""}
                                onLocationSelect={(location) => {
                                  field.onChange(location.name);
                                  form.setValue("latitude", location.lat ?? undefined);
                                  form.setValue("longitude", location.lng ?? undefined);
                                  form.setValue("facilityId", null);
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
                      name="meetingLink"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="https://zoom.us/j/..."
                              data-testid="input-event-meeting-link"
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

                <div className="space-y-3">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Audience
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "all", label: "Everyone" },
                      { value: "program", label: "Program" },
                      { value: "team", label: "Team" },
                      { value: "user", label: "User" },
                      { value: "role", label: "Role" },
                      { value: "division", label: "Division" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          String(watchedTargetType) === opt.value
                            ? "bg-blue-600 text-white"
                            : "border bg-background hover:bg-muted"
                        }`}
                        onClick={() => {
                          form.setValue("targetType", opt.value as any);
                          setSelectedUsers([]);
                          setSelectedTeams([]);
                          setSelectedDivisions([]);
                          setSelectedPrograms([]);
                          setSelectedRoles([]);
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {String(watchedTargetType) === "user" && (
                    <div className="space-y-2">
                      <Input
                        placeholder="Search by name, email, or role..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                      />
                      <div className="border rounded-md p-3 max-h-60 overflow-y-auto space-y-2">
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
                                checked={selectedUsers.includes(user.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) setSelectedUsers([...selectedUsers, user.id]);
                                  else setSelectedUsers(selectedUsers.filter((id) => id !== user.id));
                                }}
                                data-testid={`checkbox-user-${user.id}`}
                              />
                              <label className="text-sm cursor-pointer">
                                {user.firstName} {user.lastName} - {user.role} ({user.email})
                              </label>
                            </div>
                          ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {selectedUsers.length} user(s) selected
                      </p>
                    </div>
                  )}

                  {String(watchedTargetType) === "team" && (
                    <div className="space-y-2">
                      <div className="border rounded-md p-3 max-h-60 overflow-y-auto space-y-2">
                        {teams.map((team: any) => (
                          <div key={team.id} className="flex items-center space-x-2">
                            <Checkbox
                              checked={selectedTeams.includes(String(team.id))}
                              onCheckedChange={(checked) => {
                                if (checked) setSelectedTeams([...selectedTeams, String(team.id)]);
                                else setSelectedTeams(selectedTeams.filter((id) => id !== String(team.id)));
                              }}
                              data-testid={`checkbox-team-${team.id}`}
                            />
                            <label className="text-sm cursor-pointer">
                              {team.name}
                              {team.programType ? ` (${team.programType})` : ""}
                            </label>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {selectedTeams.length} team(s) selected
                      </p>
                    </div>
                  )}

                  {String(watchedTargetType) === "division" && (
                    <div className="space-y-2">
                      <div className="border rounded-md p-3 max-h-60 overflow-y-auto space-y-2">
                        {divisions
                          .filter((d: any) => d.isActive)
                          .map((division: any) => (
                            <div key={division.id} className="flex items-center space-x-2">
                              <Checkbox
                                checked={selectedDivisions.includes(String(division.id))}
                                onCheckedChange={(checked) => {
                                  if (checked) setSelectedDivisions([...selectedDivisions, String(division.id)]);
                                  else setSelectedDivisions(selectedDivisions.filter((id) => id !== String(division.id)));
                                }}
                                data-testid={`checkbox-division-${division.id}`}
                              />
                              <label className="text-sm cursor-pointer">
                                {division.name} {division.ageRange ? `(${division.ageRange})` : ""}
                              </label>
                            </div>
                          ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {selectedDivisions.length} division(s) selected
                      </p>
                    </div>
                  )}

                  {String(watchedTargetType) === "program" && (
                    <div className="space-y-2">
                      <div className="border rounded-md p-3 max-h-60 overflow-y-auto space-y-2">
                        {programs
                          .filter((p: any) => p.isActive && p.productCategory === "service")
                          .map((program: any) => (
                            <div key={program.id} className="flex items-center space-x-2">
                              <Checkbox
                                checked={selectedPrograms.includes(String(program.id))}
                                onCheckedChange={(checked) => {
                                  if (checked) setSelectedPrograms([...selectedPrograms, String(program.id)]);
                                  else setSelectedPrograms(selectedPrograms.filter((id) => id !== String(program.id)));
                                }}
                                data-testid={`checkbox-program-${program.id}`}
                              />
                              <label className="text-sm cursor-pointer">{program.name}</label>
                            </div>
                          ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {selectedPrograms.length} program(s) selected
                      </p>
                    </div>
                  )}

                  {String(watchedTargetType) === "role" && (
                    <div className="space-y-2">
                      <div className="border rounded-md p-3 max-h-60 overflow-y-auto space-y-2">
                        {["player", "parent", "coach", "admin"].map((role) => (
                          <div key={role} className="flex items-center space-x-2">
                            <Checkbox
                              checked={selectedRoles.includes(role)}
                              onCheckedChange={(checked) => {
                                if (checked) setSelectedRoles([...selectedRoles, role]);
                                else setSelectedRoles(selectedRoles.filter((r) => r !== role));
                              }}
                              data-testid={`checkbox-role-${role}`}
                            />
                            <label className="text-sm cursor-pointer capitalize">{role}</label>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {selectedRoles.length} role(s) selected
                      </p>
                    </div>
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
                  eventStartTime={watchedStartTime ? new Date(watchedStartTime) : undefined}
                  windows={eventWindows}
                  onChange={setEventWindows}
                />
              </div>
            </div>

            </div>

            <div className="flex items-center justify-between border-t pt-4 shrink-0 bg-background">
              <p className="text-sm text-muted-foreground">
                {(!watchedTitle || !watchedStartTime || !watchedEndTime || !watchedLocation) &&
                  `Missing: ${[
                    !watchedTitle && "title",
                    !watchedStartTime && "dates",
                    !watchedEndTime && "dates",
                    !watchedLocation && "location",
                  ]
                    .filter(Boolean)
                    .join(", ")}`}
              </p>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createEvent.isPending ||
                    !watchedTitle ||
                    !watchedStartTime ||
                    !watchedEndTime ||
                    !watchedLocation
                  }
                  data-testid="button-submit-event"
                >
                  {createEvent.isPending ? "Creating..." : "Create Event"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
