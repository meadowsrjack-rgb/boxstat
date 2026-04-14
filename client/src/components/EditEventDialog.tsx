import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Settings2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { LocationSearch } from "@/components/LocationSearch";
import DateTimeRangePicker from "@/components/DateTimeRangePicker";
import EventWindowsConfigurator from "@/components/EventWindowsConfigurator";
import { TIMEZONE_OPTIONS, localDatetimeToUTC, utcToLocalDatetime, ensureUtcString } from "@/lib/time";
import type { EventWindow } from "@shared/schema";

interface EditEventDialogProps {
  event: any;
  teams: any[];
  programs: any[];
  facilities: any[];
  organization: any;
  onClose: () => void;
}

function deriveEditState(event: any) {
  const etz = event.timezone || "America/Los_Angeles";

  const eventToEdit: any = { ...event };

  const allRoles = ["player", "coach", "parent", "admin"];
  const hasAllRoles =
    event.assignTo?.roles && allRoles.every((r: string) => event.assignTo.roles.includes(r));

  if (hasAllRoles) {
    eventToEdit.targetType = "all";
    eventToEdit.targetId = "";
  } else if (event.scheduleRequestSource && event.assignTo?.users?.length > 0) {
    eventToEdit.targetType = "user";
    eventToEdit.targetIds = event.assignTo.users.map(String);
  } else if (event.assignTo?.teams?.length > 0) {
    eventToEdit.targetType = "team";
    eventToEdit.targetIds = event.assignTo.teams.map(String);
  } else if (event.assignTo?.programs?.length > 0) {
    eventToEdit.targetType = "program";
    eventToEdit.targetIds = event.assignTo.programs.map(String);
  } else if (event.assignTo?.divisions?.length > 0) {
    eventToEdit.targetType = "division";
    eventToEdit.targetIds = event.assignTo.divisions.map(String);
  } else if (event.assignTo?.users?.length > 0) {
    eventToEdit.targetType = "user";
    eventToEdit.targetIds = event.assignTo.users.map(String);
  } else if (event.assignTo?.roles?.length > 0) {
    eventToEdit.targetType = "role";
    eventToEdit.targetIds = event.assignTo.roles.map(String);
  } else if (event.targetType) {
    if (event.targetId) eventToEdit.targetId = String(event.targetId);
  } else {
    eventToEdit.targetType = "all";
  }

  if (eventToEdit.startTime) {
    eventToEdit.startTime = utcToLocalDatetime(ensureUtcString(eventToEdit.startTime), etz);
  }
  if (eventToEdit.endTime) {
    eventToEdit.endTime = utcToLocalDatetime(ensureUtcString(eventToEdit.endTime), etz);
  }

  const locationType: "physical" | "online" = event.location === "Online" ? "online" : "physical";

  let isRecurring = false;
  let recurrenceFrequency: "daily" | "weekly" | "biweekly" | "monthly" = "weekly";
  let recurrenceCount = 4;
  let recurrenceDays: number[] = [];
  let recurrenceEndType: "count" | "date" = "count";
  let recurrenceEndDate = "";

  if (event.isRecurring || event.recurringType) {
    isRecurring = true;
    const freq =
      event.recurringType &&
      ["daily", "weekly", "biweekly", "monthly"].includes(event.recurringType)
        ? (event.recurringType as "daily" | "weekly" | "biweekly" | "monthly")
        : "weekly";
    recurrenceFrequency = freq;

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
        recurrenceDays = d !== undefined ? [d] : [];
      }
    }

    recurrenceCount = 4;
    if (event.recurringEndDate) {
      recurrenceEndType = "date";
      const endDateStr =
        typeof event.recurringEndDate === "string" && !event.recurringEndDate.includes("T")
          ? event.recurringEndDate.split(" ")[0]
          : event.recurringEndDate.split("T")[0];
      recurrenceEndDate = endDateStr;
    }
  }

  return {
    eventToEdit,
    locationType,
    isRecurring,
    recurrenceFrequency,
    recurrenceCount,
    recurrenceDays,
    recurrenceEndType,
    recurrenceEndDate,
  };
}

export function EditEventDialog({ event, teams, programs, facilities, organization, onClose }: EditEventDialogProps) {
  const { toast } = useToast();

  const init = deriveEditState(event);

  const [editingEvent, setEditingEvent] = useState<any>(init.eventToEdit);
  const [locationType, setLocationType] = useState<"physical" | "online">(init.locationType);
  const [isRecurring, setIsRecurring] = useState(init.isRecurring);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<"daily" | "weekly" | "biweekly" | "monthly">(init.recurrenceFrequency);
  const [recurrenceCount, setRecurrenceCount] = useState(init.recurrenceCount);
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>(init.recurrenceDays);
  const [recurrenceEndType, setRecurrenceEndType] = useState<"count" | "date">(init.recurrenceEndType);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(init.recurrenceEndDate);
  const [userSearch, setUserSearch] = useState("");
  const [eventWindows, setEventWindows] = useState<Partial<EventWindow>[]>([]);
  const [showFacilityManager, setShowFacilityManager] = useState(false);
  const [newFacilityName, setNewFacilityName] = useState("");
  const [newFacilityAddress, setNewFacilityAddress] = useState("");
  const [newFacilityLat, setNewFacilityLat] = useState("");
  const [newFacilityLng, setNewFacilityLng] = useState("");

  const { data: allUsers = [] } = useQuery<any[]>({ queryKey: ["/api/users"] });
  const { data: divisions = [] } = useQuery<any[]>({ queryKey: ["/api/divisions"] });

  useEffect(() => {
    (async () => {
      try {
        const windows = await apiRequest("GET", `/api/event-windows/event/${event.id}`);
        setEventWindows(windows);
      } catch {
        setEventWindows([]);
      }
    })();
  }, [event.id]);

  const addFacilityMutation = useMutation({
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

  const deleteFacilityMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/facilities/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/facilities"] });
      toast({ title: "Facility deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete facility", variant: "destructive" });
    },
  });

  const updateEvent = useMutation({
    mutationFn: async ({ id, targetType, targetId, targetIds, ...data }: any) => {
      const payload: any = { ...data };
      const tz = data.timezone || "America/Los_Angeles";
      if (payload.startTime && !payload.startTime.includes("Z") && !payload.startTime.match(/[+-]\d{2}:/)) {
        payload.startTime = localDatetimeToUTC(payload.startTime, tz);
      }
      if (payload.endTime && !payload.endTime.includes("Z") && !payload.endTime.match(/[+-]\d{2}:/)) {
        payload.endTime = localDatetimeToUTC(payload.endTime, tz);
      }

      const ids = targetIds?.length > 0 ? targetIds : targetId ? [String(targetId)] : [];

      if (targetType === "team" && ids.length > 0) {
        payload.assignTo = { teams: ids };
        payload.visibility = { teams: ids };
      } else if (targetType === "program" && ids.length > 0) {
        payload.assignTo = { programs: ids };
        payload.visibility = { programs: ids };
      } else if (targetType === "division" && ids.length > 0) {
        payload.assignTo = { divisions: ids };
        payload.visibility = { divisions: ids };
      } else if (targetType === "user" && ids.length > 0) {
        payload.assignTo = { users: ids };
        payload.visibility = { users: ids };
      } else if (targetType === "role" && ids.length > 0) {
        payload.assignTo = { roles: ids };
        payload.visibility = { roles: ids };
      } else if (targetType === "all") {
        payload.assignTo = { roles: ["player", "coach", "parent", "admin"] };
        payload.visibility = { roles: ["player", "coach", "parent", "admin"] };
      }

      const updatedEvent = await apiRequest("PATCH", `/api/events/${id}`, payload);

      await apiRequest("DELETE", `/api/event-windows/event/${id}`);
      for (const window of eventWindows) {
        await apiRequest("POST", "/api/event-windows", {
          ...window,
          eventId: parseInt(id),
        });
      }

      return updatedEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Event updated successfully" });
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to update event", variant: "destructive" });
    },
  });

  const handleSave = async () => {
    if (isRecurring) {
      if (
        (recurrenceFrequency === "weekly" || recurrenceFrequency === "biweekly") &&
        recurrenceDays.length === 0
      ) {
        toast({ title: "Please select at least one day of the week", variant: "destructive" });
        return;
      }
      if (recurrenceEndType === "date" && !recurrenceEndDate) {
        toast({ title: "Please select an end date for recurring events", variant: "destructive" });
        return;
      }
    }

    const etz = editingEvent.timezone || "America/Los_Angeles";
    const recurringEndDateISO =
      isRecurring && recurrenceEndType === "date" && recurrenceEndDate
        ? recurrenceEndDate + "T23:59:59Z"
        : null;

    const updatedData = {
      ...editingEvent,
      startTime: editingEvent.startTime
        ? localDatetimeToUTC(editingEvent.startTime, etz)
        : editingEvent.startTime,
      endTime: editingEvent.endTime
        ? localDatetimeToUTC(editingEvent.endTime, etz)
        : editingEvent.endTime,
      isRecurring,
      recurringType: isRecurring ? recurrenceFrequency : null,
      recurringEndDate: isRecurring ? recurringEndDateISO : null,
    };

    try {
      await updateEvent.mutateAsync(updatedData);
    } catch {
      return;
    }

    if (isRecurring) {
      const startDate = new Date(updatedData.startTime);
      const endDate = new Date(updatedData.endTime);
      const durationMs = endDate.getTime() - startDate.getTime();

      let endLimit: Date | null = null;
      if (recurrenceEndType === "date" && recurrenceEndDate) {
        const [year, month, day] = recurrenceEndDate.split("-").map(Number);
        endLimit = new Date(year, month - 1, day, 23, 59, 59);
      }
      const maxCount = recurrenceEndType === "count" ? recurrenceCount : 1000;

      const eventsToCreate: any[] = [];
      let currentStart = new Date(startDate);
      let count = 0;

      if (
        (recurrenceFrequency === "weekly" || recurrenceFrequency === "biweekly") &&
        recurrenceDays.length > 0
      ) {
        const weekInterval = recurrenceFrequency === "biweekly" ? 2 : 1;
        let weekStart = new Date(currentStart);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());

        while (count < maxCount) {
          if (endLimit && weekStart > endLimit) break;
          for (const dayOfWeek of recurrenceDays.sort((a: number, b: number) => a - b)) {
            if (count >= maxCount) break;
            const eventDate = new Date(weekStart);
            eventDate.setDate(eventDate.getDate() + dayOfWeek);
            eventDate.setHours(startDate.getHours(), startDate.getMinutes(), 0, 0);
            if (endLimit && eventDate > endLimit) continue;
            if (eventDate > startDate) {
              const newEnd = new Date(eventDate.getTime() + durationMs);
              eventsToCreate.push({
                ...updatedData,
                id: undefined,
                startTime: eventDate.toISOString(),
                endTime: newEnd.toISOString(),
              });
              count++;
            }
          }
          weekStart.setDate(weekStart.getDate() + 7 * weekInterval);
        }
      } else {
        while (count < maxCount) {
          if (recurrenceFrequency === "daily") {
            currentStart.setDate(currentStart.getDate() + 1);
          } else if (recurrenceFrequency === "weekly") {
            currentStart.setDate(currentStart.getDate() + 7);
          } else if (recurrenceFrequency === "biweekly") {
            currentStart.setDate(currentStart.getDate() + 14);
          } else if (recurrenceFrequency === "monthly") {
            currentStart.setMonth(currentStart.getMonth() + 1);
          }
          if (endLimit && currentStart > endLimit) break;
          const newEnd = new Date(currentStart.getTime() + durationMs);
          eventsToCreate.push({
            ...updatedData,
            id: undefined,
            startTime: new Date(currentStart).toISOString(),
            endTime: newEnd.toISOString(),
          });
          count++;
        }
      }

      if (eventsToCreate.length > 0) {
        try {
          const batchResult = await apiRequest("POST", "/api/events/batch", { events: eventsToCreate });
          const createdCount = batchResult?.count || 0;
          queryClient.invalidateQueries({ queryKey: ["/api/events"] });
          toast({ title: `Created ${createdCount} additional recurring event(s)` });
        } catch (e) {
          console.error("Failed to create recurring events:", e);
          toast({ title: "Failed to create recurring events", variant: "destructive" });
        }
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      }
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="sr-only">
          <DialogTitle>Edit Event</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider bg-amber-50 text-amber-700 rounded-full border border-amber-200">
            Edit Event
          </span>

          <div className="space-y-2">
            <Input
              id="edit-event-title"
              value={editingEvent.title || ""}
              onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
              placeholder="Event title..."
              className="text-lg h-12"
              data-testid="input-edit-event-title"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-3 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Event Type
                </label>
                <Select
                  value={editingEvent.type || editingEvent.eventType || "practice"}
                  onValueChange={(value) => setEditingEvent({ ...editingEvent, type: value })}
                >
                  <SelectTrigger id="edit-event-type" data-testid="select-edit-event-type">
                    <SelectValue />
                  </SelectTrigger>
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
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Date &amp; Time
                </label>
                <DateTimeRangePicker
                  startValue={editingEvent.startTime || ""}
                  endValue={editingEvent.endTime || ""}
                  onStartChange={(v) => setEditingEvent({ ...editingEvent, startTime: v })}
                  onEndChange={(v) => setEditingEvent({ ...editingEvent, endTime: v })}
                />
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Timezone</label>
                  <Select
                    value={editingEvent.timezone || "America/Los_Angeles"}
                    onValueChange={(value) => setEditingEvent({ ...editingEvent, timezone: value })}
                  >
                    <SelectTrigger className="h-9" data-testid="select-edit-event-timezone">
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
                      setEditingEvent({ ...editingEvent, location: "", meetingLink: "", latitude: undefined, longitude: undefined });
                    }}
                  >
                    Physical
                  </button>
                  <button
                    type="button"
                    className={`px-4 py-2 text-sm font-medium transition-colors ${locationType === "online" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
                    onClick={() => {
                      setLocationType("online");
                      setEditingEvent({ ...editingEvent, location: "Online", latitude: undefined, longitude: undefined });
                    }}
                  >
                    Online
                  </button>
                </div>

                {locationType === "physical" ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-muted-foreground">Facility</label>
                        <button
                          type="button"
                          onClick={() => setShowFacilityManager(!showFacilityManager)}
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <Settings2 className="w-3 h-3" />
                          {showFacilityManager ? "Done" : "Manage"}
                        </button>
                      </div>

                      {!showFacilityManager ? (
                        <Select
                          value={editingEvent.facilityId ? String(editingEvent.facilityId) : "none"}
                          onValueChange={(value) => {
                            if (value === "none") {
                              setEditingEvent({ ...editingEvent, facilityId: null, location: "", latitude: undefined, longitude: undefined });
                            } else {
                              const fac = facilities.find((f: any) => String(f.id) === value);
                              if (fac) {
                                setEditingEvent({
                                  ...editingEvent,
                                  facilityId: fac.id,
                                  location: fac.address,
                                  latitude: fac.latitude,
                                  longitude: fac.longitude,
                                });
                              }
                            }
                          }}
                        >
                          <SelectTrigger data-testid="select-edit-event-facility">
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
                                    onClick={() => {
                                      if (confirm(`Delete "${f.name}"?`)) {
                                        deleteFacilityMutation.mutate(f.id);
                                      }
                                    }}
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
                              placeholder="Facility name"
                              value={newFacilityName}
                              onChange={(e) => setNewFacilityName(e.target.value)}
                              className="h-8 text-sm"
                            />
                            <Input
                              placeholder="Address"
                              value={newFacilityAddress}
                              onChange={(e) => setNewFacilityAddress(e.target.value)}
                              className="h-8 text-sm"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                placeholder="Latitude"
                                value={newFacilityLat}
                                onChange={(e) => setNewFacilityLat(e.target.value)}
                                className="h-8 text-sm"
                                type="number"
                                step="any"
                              />
                              <Input
                                placeholder="Longitude"
                                value={newFacilityLng}
                                onChange={(e) => setNewFacilityLng(e.target.value)}
                                className="h-8 text-sm"
                                type="number"
                                step="any"
                              />
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              className="w-full"
                              disabled={!newFacilityName.trim() || !newFacilityAddress.trim() || addFacilityMutation.isPending}
                              onClick={() => addFacilityMutation.mutate()}
                            >
                              <Plus className="w-3.5 h-3.5 mr-1" />
                              {addFacilityMutation.isPending ? "Adding..." : "Add Facility"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                    {editingEvent.facilityId && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Court / Field</label>
                        <Input
                          value={editingEvent.courtName || ""}
                          onChange={(e) => setEditingEvent({ ...editingEvent, courtName: e.target.value })}
                          placeholder="e.g. Court 3, Gym B, Field A"
                          data-testid="input-edit-event-court"
                        />
                      </div>
                    )}
                    <LocationSearch
                      value={editingEvent.location === "Online" ? "" : editingEvent.location || ""}
                      onLocationSelect={(location) => {
                        setEditingEvent({
                          ...editingEvent,
                          location: location.name,
                          latitude: location.lat ?? undefined,
                          longitude: location.lng ?? undefined,
                          facilityId: null,
                        });
                      }}
                      placeholder="Search for a venue or address..."
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      {editingEvent.facilityId
                        ? "Facility address auto-filled above. Override with manual search if needed."
                        : "Search and select a location — enables GPS check-in geo-fencing"}
                    </p>
                  </>
                ) : (
                  <>
                    <Input
                      value={editingEvent.meetingLink || ""}
                      onChange={(e) => setEditingEvent({ ...editingEvent, meetingLink: e.target.value })}
                      placeholder="https://zoom.us/j/..."
                      data-testid="input-edit-event-meeting-link"
                    />
                    <p className="text-xs text-muted-foreground">
                      Paste a Zoom, Google Meet, or other meeting link
                    </p>
                  </>
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
                        (editingEvent.targetType || "all") === opt.value
                          ? "bg-blue-600 text-white"
                          : "border bg-background hover:bg-muted"
                      }`}
                      onClick={() =>
                        setEditingEvent({ ...editingEvent, targetType: opt.value, targetIds: [] })
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {editingEvent.targetType === "team" && (
                  <div className="space-y-2">
                    <div className="border rounded-md p-3 max-h-60 overflow-y-auto space-y-2">
                      {teams.map((team: any) => (
                        <div key={team.id} className="flex items-center space-x-2">
                          <Checkbox
                            checked={(editingEvent.targetIds || []).includes(String(team.id))}
                            onCheckedChange={(checked) => {
                              const currentIds = editingEvent.targetIds || [];
                              setEditingEvent({
                                ...editingEvent,
                                targetIds: checked
                                  ? [...currentIds, String(team.id)]
                                  : currentIds.filter((id: string) => id !== String(team.id)),
                              });
                            }}
                            data-testid={`checkbox-edit-team-${team.id}`}
                          />
                          <label className="text-sm cursor-pointer">
                            {team.name}
                            {team.programType ? ` (${team.programType})` : ""}
                          </label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {(editingEvent.targetIds || []).length} team(s) selected
                    </p>
                  </div>
                )}

                {editingEvent.targetType === "program" && (
                  <div className="space-y-2">
                    <div className="border rounded-md p-3 max-h-60 overflow-y-auto space-y-2">
                      {programs
                        .filter((p: any) => p.isActive && p.productCategory === "service")
                        .map((program: any) => (
                          <div key={program.id} className="flex items-center space-x-2">
                            <Checkbox
                              checked={(editingEvent.targetIds || []).includes(String(program.id))}
                              onCheckedChange={(checked) => {
                                const currentIds = editingEvent.targetIds || [];
                                setEditingEvent({
                                  ...editingEvent,
                                  targetIds: checked
                                    ? [...currentIds, String(program.id)]
                                    : currentIds.filter((id: string) => id !== String(program.id)),
                                });
                              }}
                              data-testid={`checkbox-edit-program-${program.id}`}
                            />
                            <label className="text-sm cursor-pointer">{program.name}</label>
                          </div>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {(editingEvent.targetIds || []).length} program(s) selected
                    </p>
                  </div>
                )}

                {editingEvent.targetType === "role" && (
                  <div className="space-y-2">
                    <div className="border rounded-md p-3 max-h-60 overflow-y-auto space-y-2">
                      {[
                        { id: "player", name: "Player" },
                        { id: "parent", name: "Parent" },
                        { id: "coach", name: "Coach" },
                        { id: "admin", name: "Admin" },
                      ].map((role) => (
                        <div key={role.id} className="flex items-center space-x-2">
                          <Checkbox
                            checked={(editingEvent.targetIds || []).includes(role.id)}
                            onCheckedChange={(checked) => {
                              const currentIds = editingEvent.targetIds || [];
                              setEditingEvent({
                                ...editingEvent,
                                targetIds: checked
                                  ? [...currentIds, role.id]
                                  : currentIds.filter((id: string) => id !== role.id),
                              });
                            }}
                            data-testid={`checkbox-edit-role-${role.id}`}
                          />
                          <label className="text-sm cursor-pointer">{role.name}</label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {(editingEvent.targetIds || []).length} role(s) selected
                    </p>
                  </div>
                )}

                {editingEvent.targetType === "user" && (
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
                              checked={(editingEvent.targetIds || []).includes(String(user.id))}
                              onCheckedChange={(checked) => {
                                const currentIds = editingEvent.targetIds || [];
                                setEditingEvent({
                                  ...editingEvent,
                                  targetIds: checked
                                    ? [...currentIds, String(user.id)]
                                    : currentIds.filter((id: string) => id !== String(user.id)),
                                });
                              }}
                              data-testid={`checkbox-edit-user-${user.id}`}
                            />
                            <label className="text-sm cursor-pointer">
                              {user.firstName} {user.lastName} ({user.email})
                            </label>
                          </div>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {(editingEvent.targetIds || []).length} user(s) selected
                    </p>
                  </div>
                )}

                {editingEvent.targetType === "division" && (
                  <div className="space-y-2">
                    <div className="border rounded-md p-3 max-h-60 overflow-y-auto space-y-2">
                      {divisions
                        .filter((d: any) => d.isActive)
                        .map((division: any) => (
                          <div key={division.id} className="flex items-center space-x-2">
                            <Checkbox
                              checked={(editingEvent.targetIds || []).includes(String(division.id))}
                              onCheckedChange={(checked) => {
                                const currentIds = editingEvent.targetIds || [];
                                setEditingEvent({
                                  ...editingEvent,
                                  targetIds: checked
                                    ? [...currentIds, String(division.id)]
                                    : currentIds.filter((id: string) => id !== String(division.id)),
                                });
                              }}
                              data-testid={`checkbox-edit-division-${division.id}`}
                            />
                            <label className="text-sm cursor-pointer">
                              {division.name} {division.ageRange ? `(${division.ageRange})` : ""}
                            </label>
                          </div>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {(editingEvent.targetIds || []).length} division(s) selected
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Description
                </label>
                <Textarea
                  id="edit-event-description"
                  value={editingEvent.description || ""}
                  onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                  placeholder="Optional notes or instructions for attendees..."
                  className="min-h-[80px]"
                  data-testid="input-edit-event-description"
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-2 space-y-5">
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-recurring-toggle" className="font-medium cursor-pointer">
                    Recurring event
                  </Label>
                  <Switch
                    id="edit-recurring-toggle"
                    checked={isRecurring}
                    onCheckedChange={setIsRecurring}
                    data-testid="switch-edit-recurring"
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
                            data-testid={`btn-edit-day-${["sun", "mon", "tue", "wed", "thu", "fri", "sat"][day]}`}
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
                        <SelectTrigger data-testid="select-edit-recurrence-count">
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
                          data-testid="input-edit-recurrence-end-date"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="edit-player-rsvp-toggle" className="font-medium cursor-pointer">
                    Player self-RSVP
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {editingEvent.playerRsvpEnabled !== false
                      ? "Players can RSVP themselves"
                      : "Only parent/guardian can RSVP"}
                  </p>
                </div>
                <Switch
                  id="edit-player-rsvp-toggle"
                  checked={editingEvent.playerRsvpEnabled !== false}
                  onCheckedChange={(checked) =>
                    setEditingEvent({ ...editingEvent, playerRsvpEnabled: checked })
                  }
                  data-testid="switch-edit-player-rsvp"
                />
              </div>

              <EventWindowsConfigurator
                eventStartTime={editingEvent.startTime ? new Date(editingEvent.startTime) : undefined}
                windows={eventWindows}
                onChange={setEventWindows}
              />
            </div>
          </div>

          </div>

          <div className="flex items-center justify-between border-t pt-4 shrink-0 bg-background">
            <p className="text-sm text-muted-foreground">
              {(!editingEvent.title?.trim() ||
                !editingEvent.startTime ||
                !editingEvent.endTime ||
                !editingEvent.location?.trim()) &&
                `Missing: ${[
                  !editingEvent.title?.trim() && "title",
                  !editingEvent.startTime && "dates",
                  !editingEvent.endTime && "dates",
                  !editingEvent.location?.trim() && "location",
                ]
                  .filter(Boolean)
                  .join(", ")}`}
            </p>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={
                  updateEvent.isPending ||
                  !editingEvent.title?.trim() ||
                  !editingEvent.startTime ||
                  !editingEvent.endTime ||
                  !editingEvent.location?.trim()
                }
                data-testid="button-submit-edit-event"
              >
                {updateEvent.isPending
                  ? "Updating..."
                  : isRecurring
                  ? "Update & Create Recurring"
                  : "Update Event"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
