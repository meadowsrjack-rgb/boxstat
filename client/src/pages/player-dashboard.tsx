'use client';

import { useAuth } from "@/hooks/useAuth";
import UypTrophyRings from "@/components/UypTrophyRings";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { User as UserType, Team, Event } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Bell,
  MoreHorizontal,
  TrendingUp,
  Play,
  Shirt,
  User,
  ChevronRight,
  Calendar as CalendarIcon,
  MessageCircle,
  Send,
  UserCheck,
  Check,
  Sparkles,
  Lock,
  Globe,
  Edit,
  MoreVertical,
  MapPin,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { format, isSameDay, isAfter, startOfDay } from "date-fns";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ===== “Wheel” option lists ===== */
const TEAM_OPTIONS = [
  "9U Black",
  "11U Black",
  "11U Red",
  "12U White",
  "12U Black",
  "Youth Girls",
  "13U Black",
  "14U Red",
  "Black Elite",
  "14U Black",
  "14U Gray",
  "HS Black",
  "HS Red",
  "HS Elite",
];
const POSITION_OPTIONS = ["PG", "SG", "SF", "PF", "C"];
const AGE_OPTIONS = Array.from({ length: 20 }, (_, i) => `${i + 6}`);
const HEIGHT_OPTIONS = Array.from({ length: 37 }, (_, i) => {
  const inches = 48 + i;
  const ft = Math.floor(inches / 12);
  const inch = inches % 12;
  return `${ft}'${inch}"`;
});
const WEIGHT_OPTIONS = Array.from({ length: 121 }, (_, i) => `${80 + i}`);
const JERSEY_OPTIONS = Array.from({ length: 100 }, (_, i) => `${i}`);

/* ===== Types ===== */
type UypEvent = Event;
type Task = {
  id: string | number;
  type: "ATTENDANCE" | "PROFILE_BIO" | "HOMEWORK" | "MODULE";
  title: string;
  status: "PENDING" | "COMPLETED";
  eventId?: string | number;
  moduleId?: string | number;
};
type CheckIn = {
  id: string | number;
  eventId: string | number;
  type: "advance" | "onsite";
  createdAt: string;
};

export default function PlayerDashboard({ childId }: { childId?: number | null }) {
  const { user } = useAuth();
  const [showFoundationProgram, setShowFoundationProgram] = useState(false);
  const [activeTab, setActiveTab] = useState<"activity" | "video" | "team" | "profile">("activity");
  const [newMessage, setNewMessage] = useState("");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();

  // Profile editing (Profile tab)
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showEditProfileDropdown, setShowEditProfileDropdown] = useState(false);
  const [privacySettings, setPrivacySettings] = useState({ height: false, weight: false, location: false });
  const [editableProfile, setEditableProfile] = useState({
    firstName: "",
    lastName: "",
    teamName: "",
    age: "",
    height: "",
    weight: "",
    location: "",
    position: "",
    jerseyNumber: "",
    instagram: "",
    twitter: "",
    tiktok: "",
  });

  // ---- Early guard
  const currentUser = user as UserType | null;
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // ---- Data
  const { data: childProfiles } = useQuery({
    queryKey: ["/api/child-profiles", currentUser.id],
    enabled: !!currentUser.id,
  });

  const urlParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const selectedChildId = childId?.toString() || urlParams.get("childId") || undefined;

  const currentChild = Array.isArray(childProfiles)
    ? childProfiles.find((c: any) => c.id.toString() === selectedChildId) || childProfiles[0]
    : null;

  const { data: userTeam } = useQuery<Team>({
    queryKey: ["/api/users", currentUser.id, "team"],
    enabled: !!currentUser.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
  });

  const { data: userEvents = [] as UypEvent[] } = useQuery<UypEvent[]>({
    queryKey: ["/api/users", currentUser.id, "events"],
    enabled: !!currentUser.id,
  });

  const { data: childEvents = [] as UypEvent[] } = useQuery<UypEvent[]>({
    queryKey: ["/api/child-profiles", selectedChildId, "events"],
    enabled: !!selectedChildId,
  });

  const displayEvents: UypEvent[] = (childEvents?.length ? childEvents : userEvents) || [];

  // Player Tasks (server-driven)
  const { data: tasks = [] as Task[] } = useQuery<Task[]>({
    queryKey: ["/api/users", currentUser.id, "tasks"],
    enabled: !!currentUser.id,
  });

  // Awards summary (counts + recent items)
  const { data: awardsSummary } = useQuery<any>({
    queryKey: ["/api/users", currentUser.id, "awards"],
    enabled: !!currentUser.id,
  });

  // Check-ins (client derives tasks from events; server stores submissions)
  const { data: checkins = [] as CheckIn[] } = useQuery<CheckIn[]>({
    queryKey: ["/api/checkins", currentUser.id],
    queryFn: async () => {
      const res = await fetch(`/api/checkins?userId=${currentUser.id}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!currentUser.id,
    staleTime: 30_000,
  });

  // Mutations
  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: string | number) => {
      const res = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Failed to complete task`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", currentUser.id, "tasks"] });
      toast({ title: "Task completed", description: "Nice work!" });
    },
    onError: (e) =>
      toast({
        title: "Could not complete task",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      }),
  });

  const createCheckInMutation = useMutation({
    mutationFn: async (payload: { eventId: string | number; type: "advance" | "onsite"; lat?: number; lng?: number }) => {
      const res = await fetch(`/api/checkins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...payload, userId: currentUser.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Failed to check in`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checkins", currentUser.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", currentUser.id, "awards"] }); // refresh badges
      toast({ title: "Checked in", description: "We recorded your check-in." });
    },
    onError: (e) =>
      toast({
        title: "Check-in failed",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      }),
  });

  // Real-time triggers (unchanged)
  useEffect(() => {
    if (!currentUser?.id) return;
    const protocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${typeof window !== "undefined" ? window.location.host : ""}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "join", userId: currentUser.id, teamId: userTeam?.id }));
      setWs(socket);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type?.includes("module") || data.type?.includes("attendance") || data.type?.includes("profile")) {
          queryClient.invalidateQueries({ queryKey: ["/api/users", currentUser.id, "tasks"] });
        }
        if (data.type === "new_team_message" && data.teamId === userTeam?.id) {
          queryClient.invalidateQueries({ queryKey: ["/api/teams", userTeam?.id, "messages"] });
        }
      } catch (e) {
        console.error("WS parse error", e);
      }
    };

    socket.onclose = () => setWs(null);
    return () => socket.close();
  }, [currentUser?.id, userTeam?.id, queryClient]);

  // Helpers
  const initials = `${(currentChild?.firstName || currentUser.firstName || "").charAt(0)}${(currentChild?.lastName || currentUser.lastName || "").charAt(0)}`.toUpperCase();

  const todayEvents = useMemo(() => {
    const today = new Date();
    return displayEvents.filter((ev) => {
      const dt = new Date(ev.startTime || (ev as any).start_time);
      return isSameDay(dt, today);
    });
  }, [displayEvents]);

  const upcomingEvents = useMemo(() => {
    const start = startOfDay(new Date());
    return displayEvents
      .filter((ev) => isAfter(new Date(ev.startTime || (ev as any).start_time), start))
      .filter((ev) => !isSameDay(new Date(ev.startTime || (ev as any).start_time), new Date()))
      .slice(0, 3);
  }, [displayEvents]);

  // ===== Check-in logic
  const MS = {
    HOUR: 60 * 60 * 1000,
    MIN: 60 * 1000,
  };
  const isAdvanceWindow = (start: Date, now = new Date()) => {
    const t = start.getTime();
    const n = now.getTime();
    return n >= t - 48 * MS.HOUR && n <= t - 6 * MS.HOUR;
  };
  const isOnsiteWindow = (start: Date, now = new Date()) => {
    const t = start.getTime();
    const n = now.getTime();
    // 1h before until 15m after tip-off
    return n >= t - 1 * MS.HOUR && n <= t + 15 * MS.MIN;
  };

  const checkinByEvent = useMemo(() => {
    const map = new Map<string | number, { advance?: CheckIn; onsite?: CheckIn }>();
    for (const c of checkins) {
      const entry = map.get(c.eventId) || {};
      if (c.type === "advance") entry.advance = c;
      if (c.type === "onsite") entry.onsite = c;
      map.set(c.eventId, entry);
    }
    return map;
  }, [checkins]);

  // Get coordinates helper
  const getEventCoords = (ev: any): { lat?: number; lng?: number; address?: string } => {
    if (typeof ev.locationLat === "number" && typeof ev.locationLng === "number")
      return { lat: ev.locationLat, lng: ev.locationLng };
    if (ev.locationCoords && typeof ev.locationCoords.lat === "number")
      return { lat: ev.locationCoords.lat, lng: ev.locationCoords.lng };
    if (ev.location) return { address: ev.location as string };
    return {};
  };

  const geocodeIfNeeded = async (address?: string) => {
    if (!address) return undefined;
    try {
      const res = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`);
      if (!res.ok) return undefined;
      const j = await res.json();
      if (j && typeof j.lat === "number" && typeof j.lng === "number") return { lat: j.lat, lng: j.lng };
    } catch {}
    return undefined;
  };

  const haversineMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const toRad = (v: number) => (v * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.asin(Math.sqrt(a));
    return R * c;
  };

  const doAdvanceCheckIn = async (eventId: string | number) => {
    createCheckInMutation.mutate({ eventId, type: "advance" });
  };

  const doOnsiteCheckIn = async (ev: any) => {
    const start = new Date(ev.startTime || (ev as any).start_time);
    if (!isOnsiteWindow(start)) {
      toast({ title: "Not in on-site window", description: "Try within 1 hour before start (or up to 15m after)." });
      return;
    }

    const coords = getEventCoords(ev);
    let eventLat = coords.lat;
    let eventLng = coords.lng;

    if ((eventLat == null || eventLng == null) && coords.address) {
      const gc = await geocodeIfNeeded(coords.address);
      if (gc) {
        eventLat = gc.lat;
        eventLng = gc.lng;
      }
    }

    if (eventLat == null || eventLng == null) {
      toast({
        title: "Location unavailable",
        description: "This event has no mappable location, so on-site check-in is disabled.",
        variant: "destructive",
      });
      return;
    }

    if (!("geolocation" in navigator)) {
      toast({
        title: "GPS not supported",
        description: "Your device does not support location services.",
        variant: "destructive",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const d = haversineMeters(latitude, longitude, eventLat!, eventLng!);
        const within = d <= 150; // 150m radius
        if (!within) {
          toast({
            title: "Too far from venue",
            description: `Move closer to the event location to check in (≈${Math.round(d)}m away).`,
            variant: "destructive",
          });
          return;
        }
        createCheckInMutation.mutate({ eventId: ev.id, type: "onsite", lat: latitude, lng: longitude });
      },
      (err) => {
        toast({
          title: "Location denied",
          description: "Enable location permissions to complete on-site check-in.",
          variant: "destructive",
        });
        console.error(err);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Seed editable values when entering edit mode
  const primeEditable = () => {
    setEditableProfile((prev) => ({
      ...prev,
      teamName: currentChild?.teamName || prev.teamName || "",
      age: prev.age || "",
      height: prev.height || "",
      weight: prev.weight || "",
      location: prev.location || "",
      position: currentChild?.position || prev.position || "",
      jerseyNumber: (currentChild?.jerseyNumber as any)?.toString() || prev.jerseyNumber || "",
      instagram: prev.instagram || "",
      twitter: prev.twitter || "",
      tiktok: prev.tiktok || "",
    }));
  };

  // Build rings data for UypTrophyRings
  const ringsData = useMemo(() => ({
    trophies:   { earned: awardsSummary?.trophiesCount        ?? 0, total: 10 },
    hallOfFame: { earned: awardsSummary?.hofBadgesCount       ?? 0, total: 8  },
    superstar:  { earned: awardsSummary?.superstarBadgesCount ?? 0, total: 12 },
    allStar:    { earned: awardsSummary?.allStarBadgesCount   ?? 0, total: 20 },
    starter:    { earned: awardsSummary?.starterBadgesCount   ?? 0, total: 18 },
    prospect:   { earned: awardsSummary?.prospectBadgesCount  ?? 0, total: 24 },
  }), [awardsSummary]);

  /* =================== UI =================== */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar (QR removed) */}
      <header className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-end">
            <Button variant="ghost" size="icon" className="h-12 w-12">
              <Bell className="h-12 w-12" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12"
              onClick={() => setLocation("/settings")}
            >
              <MoreHorizontal className="h-12 w-12" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-md mx-auto">
        {/* Avatar header */}
        <div className="px-6 py-6 text-center">
          <div className="flex justify-center mb-2">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={currentUser.profileImageUrl || currentChild?.profileImageUrl} alt="Player Avatar" />
                <AvatarFallback className="text-lg font-bold bg-gray-200">{initials}</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 mb-6">
          <div className="flex justify-between items-center">
            <TabButton label="activity" activeTab={activeTab} onClick={setActiveTab} Icon={TrendingUp} />
            <TabButton label="video" activeTab={activeTab} onClick={setActiveTab} Icon={Play} />
            <TabButton label="team" activeTab={activeTab} onClick={setActiveTab} Icon={Shirt} />
            <TabButton label="profile" activeTab={activeTab} onClick={setActiveTab} Icon={User} />
          </div>
        </div>

        {/* Tab content */}
        <div className="px-6">
          {/* Activity */}
          {activeTab === "activity" && (
            <div className="space-y-8">
              {/* ===== Check-In Tasks (appears above calendar) */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Check-In Tasks</h3>
                </div>

                {/* Build list from next 7 days of events */}
                <div className="space-y-3">
                  {displayEvents
                    .filter((ev) => {
                      const start = new Date(ev.startTime || (ev as any).start_time);
                      const now = new Date();
                      // Only show within next 7 days or today (and not past far)
                      const within7d = start.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000;
                      return within7d;
                    })
                    .slice(0, 8)
                    .map((ev) => {
                      const start = new Date(ev.startTime || (ev as any).start_time);
                      const check = checkinByEvent.get(ev.id) || {};
                      const advanceDone = !!check.advance;
                      const onsiteDone = !!check.onsite;
                      const inAdvance = isAdvanceWindow(start);
                      const inOnsite = isOnsiteWindow(start);
                      const canAdvance = inAdvance && !advanceDone;
                      const canOnsite = inOnsite && !onsiteDone;

                      return (
                        <div key={ev.id} className="p-3 bg-white rounded-lg shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Badge className="bg-red-100 text-red-700 text-[11px] px-2 py-0.5">Event</Badge>
                                <span className="text-xs text-gray-500">
                                  {format(start, "EEE, MMM d • h:mm a")}
                                </span>
                              </div>
                              <div className="mt-1 text-sm font-semibold text-gray-900">
                                {(ev as any).title || (ev as any).summary || "Scheduled Event"}
                              </div>
                              {(ev as any).location && (
                                <div className="mt-1 text-xs text-gray-600 flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {(ev as any).location}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col gap-2 min-w-[150px]">
                              {/* RSVP (Advance) */}
                              <Button
                                disabled={!canAdvance}
                                onClick={() => doAdvanceCheckIn(ev.id)}
                                className={`h-9 ${canAdvance ? "" : "opacity-50 cursor-not-allowed"}`}
                                variant={advanceDone ? "secondary" : "default"}
                              >
                                {advanceDone ? "RSVP’d" : "RSVP Check-In"}
                              </Button>

                              {/* On-site */}
                              <Button
                                disabled={!canOnsite}
                                onClick={() => doOnsiteCheckIn(ev)}
                                className={`h-9 ${canOnsite ? "" : "opacity-50 cursor-not-allowed"}`}
                                variant={onsiteDone ? "secondary" : "default"}
                              >
                                {onsiteDone ? "On-Site Done" : "On-Site Check-In"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                  {displayEvents.length === 0 && (
                    <div className="text-sm text-gray-500">No upcoming events to check in.</div>
                  )}
                </div>
              </section>

              {/* Today */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Today</h3>
                </div>

                <div className="space-y-3">
                  {todayEvents.length > 0 ? (
                    todayEvents.map((event) => (
                      <div key={event.id} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-blue-100 text-blue-800 text-xs px-2 py-1">
                              {event.eventType || "Event"}
                            </Badge>
                          </div>
                          <h4 className="font-semibold text-gray-900 text-sm">
                            {(event as any).title || (event as any).summary || "Event"}
                          </h4>
                          <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3" />
                              {format(new Date(event.startTime || (event as any).start_time), "h:mm a")}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500">No events today.</div>
                  )}
                </div>

                {/* Server-driven Tasks (below our check-ins, unchanged) */}
                <div className="space-y-2">
                  {tasks.length ? (
                    tasks
                      .filter((t) => t.status === "PENDING")
                      .map((t) => (
                        <div key={t.id} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px]">
                              {t.type === "ATTENDANCE"
                                ? "Attendance"
                                : t.type === "PROFILE_BIO"
                                ? "Complete Bio"
                                : t.type === "HOMEWORK"
                                ? "Homework"
                                : "Module"}
                            </Badge>
                            <span className="text-sm text-gray-800">{t.title}</span>
                          </div>
                          {t.type === "HOMEWORK" ? (
                            <Button
                              size="sm"
                              onClick={() => completeTaskMutation.mutate(t.id)}
                              disabled={completeTaskMutation.isPending}
                              className="h-8"
                            >
                              Mark Done
                            </Button>
                          ) : (
                            <span className="text-[11px] text-gray-500">auto</span>
                          )}
                        </div>
                      ))
                  ) : (
                    <div className="text-sm text-gray-500">No tasks pending.</div>
                  )}
                </div>
              </section>

              {/* View Calendar Button */}
              <section>
                <Button
                  variant="outline"
                  className="w-full text-red-600 border-red-600 hover:bg-red-50"
                  onClick={() => setLocation("/schedule")}
                >
                  View Calendar
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </section>
            </div>
          )}

          {/* Video */}
          {activeTab === "video" && (
            <div className="flex flex-col items-center justify-center py-16 space-y-6">
              <div
                className="cursor-pointer transition-transform hover:scale-105"
                onClick={() => setShowFoundationProgram(true)}
                data-testid="foundation-program-logo"
              >
                <img
                  src="/foundation-logo.png"
                  alt="UYP Foundation Program"
                  className="w-48 h-auto drop-shadow-lg hover:drop-shadow-xl transition-all"
                />
                <div className="text-center mt-4">
                  <div className="text-lg font-bold text-gray-900">Foundation Program</div>
                  <div className="text-sm text-gray-600">Tap to learn more</div>
                </div>
              </div>
            </div>
          )}

          {/* Team */}
          {activeTab === "team" && <TeamBlock />}

          {/* Profile */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              {/* Player Profile Header */}
              <div className="p-6">
                  <div className="mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        {currentChild?.firstName || currentUser.firstName} {currentChild?.lastName || currentUser.lastName}
                      </h2>
                      <p className="text-gray-600">
                        {currentChild?.teamName ? `${currentChild.teamAgeGroup} ${currentChild.teamName}` : userTeam?.name || "High School Elite"}
                      </p>
                    </div>
                  </div>

                  {/* Player Information Fields */}
                  <div className="space-y-5">
                    {isEditingProfile && (
                      <div className="flex items-center justify-end gap-2 pb-4 border-b">
                        <Button variant="outline" size="sm" onClick={() => setIsEditingProfile(false)}>
                          Cancel
                        </Button>
                        <SaveProfile
                          editableProfile={editableProfile}
                          setEditableProfile={setEditableProfile}
                          setIsEditingProfile={setIsEditingProfile}
                        />
                      </div>
                    )}



                    {/* Team */}
                    <Row
                      label="Team"
                      editing={isEditingProfile}
                      viewValue={editableProfile.teamName || currentChild?.teamName || "—"}
                      editControl={
                        <Select
                          value={editableProfile.teamName || ""}
                          onValueChange={(v) => setEditableProfile((p) => ({ ...p, teamName: v }))}
                        >
                          <SelectTrigger className="w-48 text-right">
                            <SelectValue placeholder="Select team" />
                          </SelectTrigger>
                          <SelectContent>
                            {TEAM_OPTIONS.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      }
                    />

                    {/* Age */}
                    <Row
                      label="Age"
                      editing={isEditingProfile}
                      viewValue={editableProfile.age || "—"}
                      editControl={
                        <Select value={editableProfile.age || ""} onValueChange={(v) => setEditableProfile((p) => ({ ...p, age: v }))}>
                          <SelectTrigger className="w-48 text-right">
                            <SelectValue placeholder="Age" />
                          </SelectTrigger>
                          <SelectContent>
                            {AGE_OPTIONS.map((a) => (
                              <SelectItem key={a} value={a}>
                                {a}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      }
                    />

                    {/* Height with Privacy Control */}
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">Height</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setPrivacySettings((prev) => ({ ...prev, height: !prev.height }))}
                        >
                          {privacySettings.height ? <Globe className="h-4 w-4 text-green-600" /> : <Lock className="h-4 w-4 text-gray-500" />}
                        </Button>
                      </div>
                      {isEditingProfile ? (
                        <Select value={editableProfile.height || ""} onValueChange={(v) => setEditableProfile((p) => ({ ...p, height: v }))}>
                          <SelectTrigger className="w-32 text-right">
                            <SelectValue placeholder="Height" />
                          </SelectTrigger>
                          <SelectContent>
                            {HEIGHT_OPTIONS.map((h) => (
                              <SelectItem key={h} value={h}>
                                {h}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm text-gray-600">{privacySettings.height ? editableProfile.height || "—" : "Private"}</span>
                      )}
                    </div>



                    {/* Location with Privacy Control */}
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">Location</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setPrivacySettings((prev) => ({ ...prev, location: !prev.location }))}
                        >
                          {privacySettings.location ? <Globe className="h-4 w-4 text-green-600" /> : <Lock className="h-4 w-4 text-gray-500" />}
                        </Button>
                      </div>
                      {isEditingProfile ? (
                        <CityTypeahead
                          value={editableProfile.location}
                          onChange={(city) => setEditableProfile((p) => ({ ...p, location: city }))}
                        />
                      ) : (
                        <span className="text-sm text-gray-600">{privacySettings.location ? editableProfile.location || "—" : "Private"}</span>
                      )}
                    </div>

                    {/* Position */}
                    <Row
                      label="Position"
                      editing={isEditingProfile}
                      viewValue={editableProfile.position || currentChild?.position || "—"}
                      editControl={
                        <Select value={editableProfile.position || ""} onValueChange={(v) => setEditableProfile((p) => ({ ...p, position: v }))}>
                          <SelectTrigger className="w-48 text-right">
                            <SelectValue placeholder="Position" />
                          </SelectTrigger>
                          <SelectContent>
                            {POSITION_OPTIONS.map((p) => (
                              <SelectItem key={p} value={p}>
                                {p}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      }
                    />

                    {/* Jersey # */}
                    <Row
                      label="Jersey Number"
                      editing={isEditingProfile}
                      viewValue={editableProfile.jerseyNumber || (currentChild?.jerseyNumber as any)?.toString() || "—"}
                      editControl={
                        <Select value={editableProfile.jerseyNumber || ""} onValueChange={(v) => setEditableProfile((p) => ({ ...p, jerseyNumber: v }))}>
                          <SelectTrigger className="w-48 text-right">
                            <SelectValue placeholder="#" />
                          </SelectTrigger>
                          <SelectContent>
                            {JERSEY_OPTIONS.map((n) => (
                              <SelectItem key={n} value={n}>
                                {n}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      }
                    />
                  </div>
              </div>

              {/* Trophies & Badges */}
              <div className="p-2">
                <UypTrophyRings data={ringsData} size={69} stroke={3} />
              </div>

              {/* Skills Progress */}
              <div className="p-4">
                <div className="space-y-4">
                  <SkillBar label="SHOOTING" value={72} onClick={() => setLocation("/skills")} />
                  <SkillBar label="DRIBBLING" value={85} onClick={() => setLocation("/skills")} />
                  <SkillBar label="PASSING" value={68} onClick={() => setLocation("/skills")} />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Foundation Program Popup (unchanged) */}
      <Dialog open={showFoundationProgram} onOpenChange={setShowFoundationProgram}>
        <DialogContent
          className="max-w-4xl mx-auto bg-white text-gray-900 rounded-2xl shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto p-0"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogTitle className="sr-only">UYP Foundation Program</DialogTitle>
          <div className="relative">
            <button
              onClick={() => setShowFoundationProgram(false)}
              className="absolute right-6 top-6 p-2 text-gray-400 hover:text-gray-600 transition-colors z-10"
              data-testid="close-foundation-popup"
            >
              {/* X icon removed from imports? keep using More icons; or use same X as before if desired */}
              ✕
            </button>

            {/* Header */}
            <header className="px-6 pt-10 pb-6">
              <div className="text-center">
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">UYP Foundation Program</h1>
                <p className="mt-2 max-w-2xl mx-auto text-sm leading-6 text-gray-700">
                  Master your fundamentals in 12 weeks. Five Skill drills and Strength & Conditioning exercises each week — plus a Basketball IQ lesson. Quizzes and reflections follow each week of learning.
                </p>
              </div>
            </header>

            {/* Feature strip */}
            <section className="px-6 pb-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="rounded-xl bg-red-50 p-4">
                    <p className="text-sm font-semibold text-red-600">Weekly Flow</p>
                    <p className="mt-1 text-sm text-gray-700">5 Skill & S&C videos in one focused session • 1 Basketball IQ • Quick quiz • Reflection</p>
                  </div>
                  <div className="rounded-xl bg-red-50 p-4">
                    <p className="text-sm font-semibold text-red-600">For All Levels</p>
                    <p className="mt-1 text-sm text-gray-700">Simple, game-ready drills that scale with your pace.</p>
                  </div>
                  <div className="rounded-xl bg-red-50 p-4">
                    <p className="text-sm font-semibold text-red-600">Clear Milestones</p>
                    <p className="mt-1 text-sm text-gray-700">Track progress with weekly quizzes and reflections.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Pricing */}
            <section className="px-6 py-6">
              <div className="mb-6 flex items-end justify-between">
                <h2 className="text-xl font-extrabold tracking-tight">Choose your price</h2>
                <p className="text-sm text-gray-500">Two options, same program.</p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 mb-6">
                <PriceCard title="Monthly" priceLine="$29/mo" cta="Start monthly — $29/mo" />
                <PriceCard title="Pay in Full" priceLine="$249" badge="Best value" cta="Pay in full — $249" />
              </div>

              <p className="text-center text-xs text-gray-500">30-day satisfaction guarantee.</p>
            </section>

            {/* Footer */}
            <footer className="px-6 pb-12">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
                <p className="text-sm">
                  Questions about team pricing or scholarships? <a href="#" className="font-semibold text-red-600">Contact us</a>.
                </p>
              </div>
            </footer>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ===== Small components ===== */

function TabButton({
  label,
  activeTab,
  onClick,
  Icon,
}: {
  label: "activity" | "video" | "team" | "profile";
  activeTab: string;
  onClick: (t: any) => void;
  Icon: any;
}) {
  const active = activeTab === label;
  return (
    <button
      onClick={() => onClick(label as any)}
      className={`flex flex-col items-center space-y-3 py-4 px-3 ${active ? "text-red-600" : "text-gray-400"}`}
      style={{ color: active ? "#d82428" : undefined }}
    >
      <Icon className="h-6 w-6" />
      <div
        className={`h-1 w-12 rounded-full transition-all duration-200 ${active ? "opacity-100" : "opacity-0"}`}
        style={{ backgroundColor: "#d82428" }}
      />
    </button>
  );
}

function Row({
  label,
  editing,
  viewValue,
  editControl,
}: {
  label: string;
  editing: boolean;
  viewValue: string;
  editControl: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
      <span className="text-gray-900 font-medium">{label}</span>
      {editing ? <div className="w-48 text-right">{editControl}</div> : <span className="text-gray-600">{viewValue || "—"}</span>}
    </div>
  );
}

function CityTypeahead({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [q, setQ] = useState(value || "");
  const { data: cities = [] } = useQuery<string[]>({
    queryKey: ["/api/locations", q],
    enabled: q.trim().length >= 2,
    queryFn: async () => {
      const res = await fetch(`/api/locations?query=${encodeURIComponent(q)}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  return (
    <div className="w-48 relative">
      <input
        className="w-full text-right border rounded-md px-2 py-1 text-sm"
        placeholder="City"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onBlur={() => {
          if (!value) onChange(q);
        }}
      />
      {cities.length > 0 && (
        <div className="absolute z-10 right-0 mt-1 w-full bg-white border rounded-md shadow">
          {cities.map((c) => (
            <div
              key={c}
              className="px-2 py-1 text-sm hover:bg-gray-50 cursor-pointer text-right"
              onMouseDown={() => {
                onChange(c);
                setQ(c);
              }}
            >
              {c}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SkillBar({ label, value, onClick }: { label: string; value: number; onClick?: () => void }) {
  return (
    <div className="space-y-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors" onClick={onClick}>
      <div className="flex justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="text-red-600 font-semibold">{value}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className="bg-red-600 h-2 rounded-full transition-all duration-300" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function PriceCard({ title, priceLine, cta, badge }: { title: string; priceLine: string; cta: string; badge?: string }) {
  return (
    <div className="group relative h-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-lg flex flex-col">
      {badge && (
        <span className="absolute -top-3 right-4 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
          {badge}
        </span>
      )}
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-red-600" />
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
      </div>
      <div className="mb-1 text-3xl font-extrabold tracking-tight text-gray-900">{priceLine}</div>
      <p className="mb-4 text-sm text-gray-500">{title === "Monthly" ? "Cancel anytime" : "One-time payment"}</p>
      <ul className="mb-6 space-y-3 text-sm text-gray-700">
        <li className="flex items-start gap-3">
          <Check className="mt-0.5 h-4 w-4 text-red-600" />
          <span>12-week curriculum with weekly checklist</span>
        </li>
        <li className="flex items-start gap-3">
          <Check className="mt-0.5 h-4 w-4 text-red-600" />
          <span>Five Skill + S&C videos each week (one focused session)</span>
        </li>
        <li className="flex items-start gap-3">
          <Check className="mt-0.5 h-4 w-4 text-red-600" />
          <span>Basketball IQ videos</span>
        </li>
        <li className="flex items-start gap-3">
          <Check className="mt-0.5 h-4 w-4 text-red-600" />
          <span>Weekly quiz + reflection</span>
        </li>
      </ul>
      <div className="mt-auto">
        <button className="h-12 w-full rounded-xl bg-red-600 text-sm font-semibold text-white transition hover:bg-red-700">
          {cta}
        </button>
      </div>
    </div>
  );
}

function TeamBlock() {
  const { user } = useAuth();
  const currentUser = user as UserType;
  const { data: userTeam } = useQuery<Team>({
    queryKey: ["/api/users", currentUser.id, "team"],
    enabled: !!currentUser.id,
  });
  const { data: teamMessages = [] } = useQuery<any[]>({
    queryKey: ["/api/teams", userTeam?.id, "messages"],
    enabled: !!userTeam?.id,
    refetchInterval: 30000,
  });
  const [newMessage, setNewMessage] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await fetch(`/api/teams/${userTeam?.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message, messageType: "text" }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/teams", userTeam?.id, "messages"] });
      toast({ title: "Message sent", description: "Your message has been sent to the team." });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">My Team</h2>
        {userTeam ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center">
                  <Shirt className="h-8 w-8 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-lg">{userTeam.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{userTeam.ageGroup}</p>
                  <div className="space-y-1 text-sm text-gray-500">
                    {userTeam.coachId && (
                      <div className="flex items-center space-x-2">
                        <UserCheck className="h-4 w-4" />
                        <span>Coach</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="text-sm text-gray-500">No team assigned yet.</div>
        )}
      </div>

      {/* Team Messages */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Team Messages</h3>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="space-y-4 max-h-64 overflow-y-auto">
              {teamMessages.length > 0 ? (
                teamMessages.map((message: any) => (
                  <div key={message.id} className="flex space-x-3 py-3 border-b border-gray-100 last:border-b-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={message.sender?.profileImageUrl || "/placeholder-player.jpg"} />
                      <AvatarFallback
                        className={message.sender?.userType === "admin" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}
                      >
                        {message.sender?.firstName?.[0]}
                        {message.sender?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900">
                          {message.sender?.firstName} {message.sender?.lastName}
                        </p>
                        {message.sender?.userType === "admin" && (
                          <Badge variant="secondary" className="text-xs bg-red-100 text-red-600">
                            Coach
                          </Badge>
                        )}
                        <p className="text-xs text-gray-500">
                          {message.createdAt ? format(new Date(message.createdAt), "MMM d, h:mm a") : "Now"}
                        </p>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{message.message}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No messages yet. Start the conversation!</p>
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex space-x-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1"
                />
                <Button
                  size="icon"
                  disabled={!newMessage.trim() || sendMessageMutation.isPending}
                  onClick={() => {
                    if (newMessage.trim()) sendMessageMutation.mutate(newMessage.trim());
                  }}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SaveProfile({
  editableProfile,
  setEditableProfile,
  setIsEditingProfile,
}: {
  editableProfile: any;
  setEditableProfile: (fn: any) => void;
  setIsEditingProfile: (b: boolean) => void;
}) {
  const { user } = useAuth();
  const currentUser = user as UserType;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateProfile = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`/api/users/${currentUser.id}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save profile");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Profile updated", description: "Changes saved." });
      queryClient.invalidateQueries({ queryKey: ["/api/users", currentUser.id] });
      setIsEditingProfile(false);
    },
    onError: (e) => toast({ title: "Save failed", description: String(e), variant: "destructive" }),
  });

  return (
    <Button size="sm" onClick={() => updateProfile.mutate(editableProfile)} disabled={updateProfile.isPending}>
      {updateProfile.isPending ? "Saving..." : "Save Changes"}
    </Button>
  );
}
