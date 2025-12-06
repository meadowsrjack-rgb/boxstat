"use client";

import { useAuth } from "@/hooks/useAuth";
import PlayerCalendar from "@/components/PlayerCalendar";
import EventDetailModal from "@/components/EventDetailModal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import type { User as UserType, Event } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Bell,
  MoreHorizontal,
  Calendar as CalendarIcon,
  Users,
  Trophy,
  DollarSign,
  FileText,
  Send,
  UserCheck,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Copy,
  Gauge,
  Sparkles,
  User,
  Award,
  Filter,
  ChevronDown,
  MessageCircle,
  Check,
  X,
  UserPlus,
  UserMinus,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { format, isSameDay, isAfter, startOfDay } from "date-fns";
import PlayerSearch from "@/components/PlayerSearch";
import PlayerCard from "@/components/PlayerCard";
import TeamChat from "@/components/TeamChat";
import LeadEvaluationForm from "@/components/LeadEvaluationForm";
import { AwardsDialog, EvaluationDialog, SKILL_CATEGORIES, TEAM_TROPHIES, COACH_AWARDS, type PlayerLite, type EvalScores, type Quarter, type SkillCategoryName } from "@/components/CoachAwardDialogs";
import { NotificationBell } from "@/components/NotificationBell";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";

/* =================== Types =================== */

type UypEvent = Event;

type CoachTeam = {
  id: number;
  name: string;
  ageGroup?: string;
  program?: string;
  inviteCode?: string;
  roster: Array<{
    id: number;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
    position?: string;
    jerseyNumber?: number | null;
  }>;
};

type CoachPaySummary = {
  status: "paid" | "past_due" | "upcoming" | "processing" | "on_hold";
  nextPayDate: string | null; // ISO
  nextPayAmountCents: number | null;
  currency: string; // e.g. "usd"
  portalUrl?: string | null; // payroll portal
};

// PlayerLite and Quarter types imported from shared CoachAwardDialogs component

// Skills schema moved to shared CoachAwardDialogs component

// Awards constants moved to shared CoachAwardDialogs component

/* =================== Component =================== */
export default function CoachDashboard() {
  const { user } = useAuth();
  const currentUser = user as UserType | null;
  
  // For multi-role accounts (e.g., admin viewing coach dashboard), find the coach profile
  const { data: linkedProfiles = [] } = useQuery<Array<{id: string; role: string; firstName: string; lastName: string}>>({
    queryKey: [`/api/users/${currentUser?.id}/linked-profiles`],
    enabled: !!currentUser?.id && currentUser?.role !== 'coach',
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/users/${currentUser?.id}/linked-profiles`, { 
        credentials: "include", 
        headers 
      });
      if (!res.ok) return [];
      return res.json();
    },
  });
  
  // Use the coach profile if user is admin/parent with a coach profile, otherwise use current user
  const coachProfile = linkedProfiles.find(p => p.role === 'coach');
  const coachProfileId = currentUser?.role === 'coach' 
    ? currentUser?.id 
    : (coachProfile?.id || (user as any)?.activeProfileId || currentUser?.id);
  const [activeTab, setActiveTab] = useState<"calendar" | "roster" | "pay" | "hr">(() => {
    if (typeof window === "undefined") return "calendar";
    const stored = localStorage.getItem("coachDashboardTab");
    // Sanitize legacy "badges" values to default to "calendar"
    if (stored === "badges" || !["calendar", "roster", "pay", "hr"].includes(stored || "")) {
      return "calendar";
    }
    return stored as "calendar" | "roster" | "pay" | "hr";
  });
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Redirect non-coach and non-admin users
  useEffect(() => {
    if (currentUser && currentUser.role !== "coach" && currentUser.role !== "admin") {
      setLocation("/unified-account");
    }
  }, [currentUser, setLocation]);
  
  // Enhanced calendar state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [eventDetailOpen, setEventDetailOpen] = useState(false);


  // Roster row modals
  const [evalOpen, setEvalOpen] = useState(false);
  const [awardsOpen, setAwardsOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerLite | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  // Team filtering
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<'my-team' | number>('my-team');

  // Quarter/Year for evals
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [quarter, setQuarter] = useState<Quarter>(() => {
    const m = new Date().getMonth();
    return (m <= 2 ? "Q1" : m <= 5 ? "Q2" : m <= 8 ? "Q3" : "Q4") as Quarter;
  });

  // Scores state for the selected player
  const [scores, setScores] = useState<EvalScores>({});
  
  // HR Tab - Lead Evaluation Form state
  const [showLeadEvaluation, setShowLeadEvaluation] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("coachDashboardTab", activeTab);
  }, [activeTab]);

  if (!currentUser) {
    return (
      <div className="min-h-screen-safe bg-gray-50 safe-bottom flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  /* ===== Data ===== */
  const { data: coachTeam } = useQuery<CoachTeam | null>({
    queryKey: ["/api/coach/team"],
    queryFn: async () => {
      const res = await fetch("/api/coach/team", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  // Query for coach's assigned teams
  const { data: assignedTeams = [] } = useQuery<Array<{id: number; name: string; ageGroup: string}>>({
    queryKey: [`/api/coaches/${coachProfileId}/teams`],
    enabled: !!coachProfileId,
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/coaches/${coachProfileId}/teams`, { 
        credentials: "include",
        headers 
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Query for all teams (for filter dropdown - Notion teams)
  const { data: allTeams = [] } = useQuery<Array<{id: string; name: string; ageGroup?: string}>>({
    queryKey: ["/api/search/teams"],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/search/teams", { credentials: "include", headers });
      if (!res.ok) return [];
      const data = await res.json();
      return data.teams || [];
    },
  });


  // Query for selected team data (when filtering)
  const { data: filteredTeam } = useQuery<CoachTeam | null>({
    queryKey: ["/api/teams", selectedTeamFilter, "details"],
    enabled: selectedTeamFilter !== 'my-team' && typeof selectedTeamFilter === 'number',
    queryFn: async () => {
      const res = await fetch(`/api/teams/${selectedTeamFilter}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  // Query for all players from coach's assigned teams
  const { data: assignedPlayers = [] } = useQuery({
    queryKey: [`/api/coaches/${coachProfileId}/players`],
    enabled: !!coachProfileId,
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/coaches/${coachProfileId}/players`, { 
        credentials: "include",
        headers 
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Compute combined roster based on filter
  const combinedRoster = useMemo(() => {
    if (selectedTeamFilter !== 'my-team') {
      // Show filtered team roster
      return filteredTeam?.roster || [];
    }
    
    // Show roster from all assigned teams
    return assignedPlayers;
  }, [assignedPlayers, filteredTeam, selectedTeamFilter]);

  const { data: coachEvents = [] as UypEvent[] } = useQuery<UypEvent[]>({
    queryKey: ["/api/coach/events"],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/coach/events", { credentials: "include", headers });
      if (!res.ok) return [] as UypEvent[];
      return res.json();
    },
  });

  const { data: paySummary } = useQuery<CoachPaySummary | null>({
    queryKey: ["/api/coach/pay/summary"],
    queryFn: async () => {
      const res = await fetch("/api/coach/pay/summary", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: hrDocs = [] as Array<{ id: string | number; title: string; url: string }> } = useQuery({
    queryKey: ["/api/coach/hr/docs"],
    queryFn: async () => {
      const res = await fetch("/api/coach/hr/docs", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: hrAnnouncements = [] as Array<{ id: string | number; title: string; body: string; createdAt: string }> } = useQuery({
    queryKey: ["/api/coach/hr/announcements"],
    queryFn: async () => {
      const res = await fetch("/api/coach/hr/announcements", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 60000,
  });

  /* ===== Mutations ===== */
  const querySaveKey = ["/api/coach/evaluations", "player", selectedPlayer?.id, quarter, year];

  const saveEvaluation = useMutation({
    mutationFn: async () => {
      if (!selectedPlayer) throw new Error("No player selected");
      const payload = { playerId: selectedPlayer.id, quarter, year, scores };
      console.log("Evaluation payload:", payload);
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`/api/coach/evaluations`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: res.statusText }));
        console.error("Evaluation error:", errorData);
        throw new Error(errorData.message || "Failed to save evaluation");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Evaluation saved" });
      // Invalidate ALL caches for the evaluated player
      if (selectedPlayer) {
        queryClient.invalidateQueries({ queryKey: querySaveKey });
        // Player dashboard and PlayerCard uses these formats
        queryClient.invalidateQueries({ queryKey: [`/api/players/${selectedPlayer.id}/latest-evaluation`] });
        queryClient.invalidateQueries({ queryKey: ["/api/players", selectedPlayer.id, "latest-evaluation"] });
        // Admin dashboard
        queryClient.invalidateQueries({ queryKey: ["/api/coach/evaluations"] });
        queryClient.invalidateQueries({ queryKey: ["/api/evaluations"] });
        queryClient.invalidateQueries({ queryKey: ["/api/evaluations", selectedPlayer.id] });
        queryClient.invalidateQueries({ queryKey: ["/api/account/players"] });
        // Coach players list
        queryClient.invalidateQueries({ queryKey: [`/api/coaches/${coachProfileId}/players`] });
        // Player profile for updated skill display
        queryClient.invalidateQueries({ queryKey: [`/api/profile/${selectedPlayer.id}`] });
        // Admin users list to refresh skill data globally
        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      }
      setEvalOpen(false);
      setScores({});
      setSelectedPlayer(null);
    },
    onError: (e: any) => toast({ title: "Save failed", description: String(e?.message || e), variant: "destructive" }),
  });

  const awardMutation = useMutation({
    mutationFn: async ({ awardId, kind }: { awardId: string; kind: "badge" | "trophy" }) => {
      if (!selectedPlayer) throw new Error("No player selected");
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`/api/coach/award`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ playerId: selectedPlayer.id, awardId, category: kind }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(errorData.message || "Failed to give award");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Award given" });
      // Invalidate ALL caches for the awarded player's awards
      if (selectedPlayer) {
        // Player dashboard and unified account page formats
        queryClient.invalidateQueries({ queryKey: [`/api/users/${selectedPlayer.id}/awards`] });
        queryClient.invalidateQueries({ queryKey: ["/api/users", selectedPlayer.id, "awards"] });
        // Legacy endpoints
        queryClient.invalidateQueries({ queryKey: [`/api/users/${selectedPlayer.id}/badges`] });
        queryClient.invalidateQueries({ queryKey: [`/api/users/${selectedPlayer.id}/trophies`] });
        // Trophies-badges page - invalidate all variations
        queryClient.invalidateQueries({ queryKey: ["/api/user-awards"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user-awards", selectedPlayer.id] });
        // Account players query (for unified account page player cards)
        queryClient.invalidateQueries({ queryKey: ["/api/account/players"] });
        // Player profile for updated award display
        queryClient.invalidateQueries({ queryKey: [`/api/profile/${selectedPlayer.id}`] });
        // Admin dashboard user list for global update
        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        // Award definitions list
        queryClient.invalidateQueries({ queryKey: ["/api/award-definitions"] });
      }
      setAwardsOpen(false);
      setSelectedPlayer(null);
    },
    onError: (e: any) => toast({ title: "Failed to give award", description: e?.message || String(e), variant: "destructive" }),
  });

  /* =================== UI =================== */
  const initials = `${(currentUser.firstName || "").charAt(0)}${(currentUser.lastName || "").charAt(0)}`.toUpperCase();

  const todayEvents = useMemo(() => {
    const today = new Date();
    return coachEvents.filter((ev) => isSameDay(new Date((ev as any).startTime || (ev as any).start_time), today));
  }, [coachEvents]);

  const upcomingEvents = useMemo(() => {
    if (isSameDay(selectedDate, new Date())) {
      const start = startOfDay(new Date());
      return coachEvents
        .filter((ev) => isAfter(new Date((ev as any).startTime || (ev as any).start_time), start))
        .filter((ev) => !isSameDay(new Date((ev as any).startTime || (ev as any).start_time), new Date()))
        .slice(0, 3);
    } else {
      return coachEvents
        .filter((ev) => isSameDay(new Date((ev as any).startTime || (ev as any).start_time), selectedDate))
        .slice(0, 10);
    }
  }, [coachEvents, selectedDate]);

  // Fetch notifications for the coach
  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: [`/api/users/${currentUser?.id}/notifications`],
    enabled: !!currentUser?.id,
  });

  // Filter for unread notifications
  const unreadNotifications = notifications.filter((n: any) => !n.isRead);

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return apiRequest(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${currentUser?.id}/notifications`] });
    },
  });

  return (
    <div className="scrollable-page bg-gray-50 safe-bottom">
      {/* Top Bar */}
      <header className="bg-white shadow-sm safe-top">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              onClick={() => setLocation("/profile-gateway")}
              aria-label="Switch Profile"
              data-testid="button-switch-profile"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <div className="flex items-center gap-1">
            <NotificationBell />
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              onClick={() => setLocation("/coach-settings")}
              aria-label="Settings"
              data-testid="button-settings"
            >
              <MoreHorizontal className="h-6 w-6" />
            </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-md mx-auto">
        {/* Announcement Banner */}
        <div className="px-6 pt-4">
          <AnnouncementBanner />
        </div>
        {/* Avatar header */}
        <div className="px-6 py-6 text-center">
          <div className="flex justify-center mb-2">
            <ProfileAvatarRing src={currentUser.profileImageUrl || undefined} initials={initials} size={88} />
          </div>
          <div className="text-sm text-gray-600">
            Coach <span className="font-semibold text-gray-900">{currentUser.firstName}</span>
          </div>
        </div>

        {/* Tabs (removed old Evaluate tab) */}
        <div className="px-6 mb-6">
          <div className="flex justify-between items-center">
            <TabButton label="calendar" activeTab={activeTab} onClick={setActiveTab} Icon={CalendarIcon} />
            <TabButton label="roster" activeTab={activeTab} onClick={setActiveTab} Icon={Users} />
            <TabButton label="pay" activeTab={activeTab} onClick={setActiveTab} Icon={DollarSign} />
            <TabButton label="hr" activeTab={activeTab} onClick={setActiveTab} Icon={FileText} />
          </div>
        </div>

        {/* Content */}
        <div className="px-6">
          {activeTab === "calendar" && (
            <div className="-mx-6">
              {/* Event Summaries - moved above calendar */}
              <div className="px-6 py-6 space-y-4">
                <section className="space-y-2">
                  <h3 className="text-lg font-bold text-gray-900">Today</h3>
                  {todayEvents.length ? (
                    todayEvents.map((event) => (
                      <div 
                        key={event.id} 
                        className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => {
                          const normalizedEvent: Event = {
                            ...event as any,
                            startTime: event.startTime instanceof Date ? event.startTime.toISOString() : event.startTime,
                            endTime: event.endTime instanceof Date ? event.endTime.toISOString() : event.endTime
                          };
                          setSelectedEvent(normalizedEvent);
                          setEventDetailOpen(true);
                        }}
                        data-testid={`event-item-${event.id}`}
                      >
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 text-sm">{(event as any).title || (event as any).summary || "Event"}</h4>
                          <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                            <span>
                              {format(new Date((event as any).startTime || (event as any).start_time), "h:mm a")}
                            </span>
                            {(event as any).location && (
                              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{(event as any).location}</span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500">No events today.</div>
                  )}
                </section>

                <section className="space-y-2">
                  <h3 className="text-lg font-bold text-gray-900">
                    {isSameDay(selectedDate, new Date()) ? "Upcoming" : `Events for ${format(selectedDate, 'MMM d')}`}
                  </h3>
                  {upcomingEvents.length ? (
                    upcomingEvents.map((event) => (
                      <div 
                        key={event.id} 
                        className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => {
                          const normalizedEvent: Event = {
                            ...event as any,
                            startTime: event.startTime instanceof Date ? event.startTime.toISOString() : event.startTime,
                            endTime: event.endTime instanceof Date ? event.endTime.toISOString() : event.endTime
                          };
                          setSelectedEvent(normalizedEvent);
                          setEventDetailOpen(true);
                        }}
                        data-testid={`upcoming-event-item-${event.id}`}
                      >
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 text-sm">{(event as any).title || (event as any).summary || "Event"}</h4>
                          <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                            <span>
                              {format(new Date((event as any).startTime || (event as any).start_time), "EEE, MMM d • h:mm a")}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500">
                      {isSameDay(selectedDate, new Date()) ? "No upcoming events." : `No events for ${format(selectedDate, 'MMM d')}.`}
                    </div>
                  )}
                </section>
              </div>

              {/* Calendar component - moved below events */}
              <PlayerCalendar 
                events={coachEvents as any} 
                currentUser={{ 
                  id: currentUser.id,
                  email: currentUser.email || "",
                  firstName: currentUser.firstName || undefined,
                  lastName: currentUser.lastName || undefined
                }}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
              />
            </div>
          )}

          {activeTab === "roster" && (
            <RosterTab
              team={(selectedTeamFilter === 'my-team' ? coachTeam : filteredTeam) || undefined}
              roster={combinedRoster}
              assignedTeams={assignedTeams}
              allTeams={allTeams}
              selectedTeamFilter={selectedTeamFilter}
              onTeamFilterChange={setSelectedTeamFilter}

              onEvaluate={(p) => {
                // Transform roster player to PlayerLite format
                const playerLite: PlayerLite = {
                  id: String(p.id),
                  firstName: p.firstName,
                  lastName: p.lastName,
                  teamName: p.teamName,
                  profileImageUrl: p.profileImageUrl
                };
                setSelectedPlayer(playerLite);
                // Load existing eval for player/quarter/year
                fetch(`/api/coach/evaluations?playerId=${playerLite.id}&quarter=${quarter}&year=${year}`, { credentials: "include" })
                  .then((r) => (r.ok ? r.json() : null))
                  .then((data) => setScores((data as EvalScores) || {}));
                setEvalOpen(true);
              }}

              onReward={(p) => {
                // Transform roster player to PlayerLite format
                const playerLite: PlayerLite = {
                  id: String(p.id),
                  firstName: p.firstName,
                  lastName: p.lastName,
                  teamName: p.teamName,
                  profileImageUrl: p.profileImageUrl
                };
                setSelectedPlayer(playerLite);
                setAwardsOpen(true);
              }}

              selectedPlayerId={selectedPlayerId}
              setSelectedPlayerId={setSelectedPlayerId}
            />
          )}

          {activeTab === "pay" && (
            <PayTab pay={paySummary || undefined} onOpenPortal={async () => {
              try {
                const res = await fetch("/api/coach/pay/portal", { method: "POST", credentials: "include" });
                const j = await res.json();
                if (j?.url) window.location.href = j.url;
                else toast({ title: "Couldn't open portal", variant: "destructive" });
              } catch (e) {
                toast({ title: "Portal error", variant: "destructive" });
              }
            }} />
          )}

          {activeTab === "hr" && (
            <HRTab 
              docs={hrDocs} 
              announcements={hrAnnouncements} 
              showLeadEvaluation={showLeadEvaluation}
              setShowLeadEvaluation={setShowLeadEvaluation}
              currentUser={currentUser}
            />
          )}

          {/* Event Detail Modal */}
          <EventDetailModal
            event={selectedEvent}
            userId={currentUser.id}
            userRole="coach"
            open={eventDetailOpen}
            onOpenChange={setEventDetailOpen}
          />
        </div>
      </main>

      {/* -------- Overlays (Team Tab integrated) -------- */}
      <EvaluationDialog
        open={evalOpen}
        onOpenChange={setEvalOpen}
        player={selectedPlayer}
        scores={scores}
        setScores={setScores}
        quarter={quarter}
        setQuarter={setQuarter}
        year={year}
        setYear={setYear}
        onSave={() => saveEvaluation.mutate()}
        saving={saveEvaluation.isPending}
      />

      <AwardsDialog
        open={awardsOpen}
        onOpenChange={(v) => {
          setAwardsOpen(v);
          if (!v) setSelectedPlayer(null);
        }}
        player={selectedPlayer}
        onGive={(awardId, kind) => awardMutation.mutate({ awardId, kind })}
        giving={awardMutation.isPending}
      />

      {/* PlayerCard Modal */}
      {selectedPlayerId && (
        <PlayerCard
          playerId={selectedPlayerId}
          isOpen={!!selectedPlayerId}
          onClose={() => setSelectedPlayerId(null)}
          isCoach={true}
        />
      )}
    </div>
  );
}

/* =================== Subcomponents =================== */

function TabButton({ label, activeTab, onClick, Icon }: { label: any; activeTab: string; onClick: (t: any) => void; Icon: any }) {
  const active = activeTab === label;
  return (
    <button
      onClick={() => onClick(label)}
      className={`flex flex-col items-center space-y-3 py-4 px-3 ${active ? "text-red-600" : "text-gray-400"}`}
      style={{ color: active ? "#d82428" : undefined }}
      data-testid={`tab-${label}`}
    >
      <Icon className="h-6 w-6" />
      <div className={`h-1 w-12 rounded-full transition-all duration-200 ${active ? "opacity-100" : "opacity-0"}`} style={{ backgroundColor: "#d82428" }} />
    </button>
  );
}

function ProfileAvatarRing({ src, initials, size = 80 }: { src?: string; initials: string; size?: number }) {
  return (
    <motion.div
      className="inline-block rounded-full p-[3px] bg-[conic-gradient(at_50%_50%,#fecaca,#fde8e8,#fecaca)] shadow-sm"
      animate={{ rotate: 360 }}
      transition={{ duration: 20, ease: "linear", repeat: Infinity }}
      whileHover={{ scale: 1.03 }}
      style={{ width: size + 6, height: size + 6 }}
    >
      <div className="rounded-full overflow-hidden bg-white ring-4 ring-white shadow-md" style={{ width: size, height: size }}>
        <Avatar className="w-full h-full">
          <AvatarImage src={src} alt="Coach Avatar" />
          <AvatarFallback className="text-lg font-bold bg-gray-200">{initials}</AvatarFallback>
        </Avatar>
      </div>
    </motion.div>
  );
}

/* ---------- Roster Tab (Team-focused with roster + chat) ---------- */
function RosterTab({
  team,
  roster,
  assignedTeams,
  allTeams,
  selectedTeamFilter,
  onTeamFilterChange,
  onEvaluate,
  onReward,
  selectedPlayerId,
  setSelectedPlayerId,
}: {
  team?: CoachTeam | null;
  roster: any[];
  assignedTeams: Array<{id: number; name: string; ageGroup: string}>;
  allTeams: Array<{id: string; name: string; ageGroup?: string}>;
  selectedTeamFilter: 'my-team' | number;
  onTeamFilterChange: (filter: 'my-team' | number) => void;
  onEvaluate: (p: PlayerLite) => void;
  onReward: (p: PlayerLite) => void;
  selectedPlayerId: string | null;
  setSelectedPlayerId: (id: string | null) => void;
}) {
  const { user } = useAuth();
  const currentUser = user as UserType;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [playerToRemove, setPlayerToRemove] = useState<{id: string; name: string} | null>(null);

  // Fetch roster for selected team (includes all Notion players)
  const { data: teamRoster = [] } = useQuery<any[]>({
    queryKey: ["/api/teams", selectedTeamId, "roster-with-notion"],
    enabled: !!selectedTeamId,
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/teams/${selectedTeamId}/roster-with-notion`, { 
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Search players (searches all players in users table)
  const searchPlayers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/search/players?q=${encodeURIComponent(query)}`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        // Transform the response format to match what the UI expects
        const players = data.players?.map((p: any) => ({
          id: p.id,
          firstName: p.first_name,
          lastName: p.last_name,
          profileImageUrl: p.profile_image_url,
          teamName: p.team_name,
          appUserId: p.id,
          hasAppProfile: true, // Players from search are app users
        })) || [];
        setSearchResults(players);
      }
    } catch (error) {
      console.error("Error searching players:", error);
    }
  };

  // Assign player to team mutation
  const assignPlayerMutation = useMutation({
    mutationFn: async (playerId: string) => {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`/api/teams/${selectedTeamId}/assign-player`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ playerId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to assign player");
      }
      return res.json();
    },
    onSuccess: (data, playerId) => {
      // Invalidate roster queries so the team list updates
      queryClient.invalidateQueries({ queryKey: ["/api/teams", selectedTeamId, "roster-with-notion"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      // Invalidate the specific player's profile so their card and dashboard updates
      queryClient.invalidateQueries({ queryKey: [`/api/profile/${playerId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${playerId}/team`] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", playerId, "team"] });
      // Invalidate admin dashboard user list
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setSearchQuery("");
      setSearchResults([]);
      toast({ title: "Success", description: "Player assigned to team" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Remove player from team mutation
  const removePlayerMutation = useMutation({
    mutationFn: async (playerId: string) => {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`/api/teams/${selectedTeamId}/remove-player`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ playerId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to remove player");
      }
      return res.json();
    },
    onSuccess: (data, playerId) => {
      // Invalidate roster queries so the team list updates
      queryClient.invalidateQueries({ queryKey: ["/api/teams", selectedTeamId, "roster-with-notion"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      // Invalidate the specific player's profile so their card and dashboard updates
      queryClient.invalidateQueries({ queryKey: [`/api/profile/${playerId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${playerId}/team`] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", playerId, "team"] });
      // Invalidate admin dashboard user list
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Success", description: "Player removed from team" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });


  // Show team list if no team is selected
  if (!selectedTeamId) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Your Teams</h3>
          <p className="text-sm text-gray-500">Select a team to view roster and chat</p>
        </div>
        
        {assignedTeams.length > 0 ? (
          <div className="grid gap-3">
            {assignedTeams.map((team) => (
              <Card 
                key={team.id} 
                className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedTeamId(team.id)}
                data-testid={`team-card-${team.id}`}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">{team.name}</div>
                    <div className="text-sm text-gray-500">
                      {team.ageGroup}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">
            No teams assigned yet. An admin will assign you to teams.
          </div>
        )}
      </div>
    );
  }

  // Show selected team details
  const selectedTeam = assignedTeams.find(t => t.id === selectedTeamId);

  return (
    <div className="space-y-6">
      {/* Team Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedTeamId(null)}
          className="mb-2 text-gray-600 hover:text-gray-900"
          data-testid="button-back-to-teams"
        >
          <ChevronRight className="h-4 w-4 mr-1 rotate-180" />
          Back to Teams
        </Button>
        <h3 className="text-lg font-bold text-gray-900">{selectedTeam?.name}</h3>
        <p className="text-sm text-gray-500">{selectedTeam?.ageGroup}</p>
      </div>

      {/* Roster */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-gray-900">Team Roster</h4>
        </div>
        {teamRoster.length > 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
                {teamRoster.map((p) => {
                  const hasAccount = p.hasAppAccount;
                  const playerId = p.appAccountId || p.notionId;
                  
                  return (
                    <div 
                      key={playerId} 
                      className={`p-4 flex items-center justify-between transition-colors ${
                        hasAccount 
                          ? "hover:bg-gray-50 cursor-pointer" 
                          : "bg-gray-50 opacity-60 cursor-default"
                      }`}
                      data-testid={`player-${playerId}`}
                      onClick={() => hasAccount && setSelectedPlayerId(p.appAccountId)}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Avatar className={`h-10 w-10 ${!hasAccount ? "grayscale" : ""}`}>
                          <AvatarImage src={p.profileImageUrl} />
                          <AvatarFallback className="text-xs">{p.firstName?.[0]}{p.lastName?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="truncate">
                          <div className={`font-medium truncate flex items-center gap-2 ${
                            hasAccount ? "text-gray-900" : "text-gray-500"
                          }`} data-testid={`text-player-name-${playerId}`}>
                            {p.name}
                            {!hasAccount && (
                              <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                                No Account
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {p.position || "Player"}{p.jerseyNumber != null ? ` • #${p.jerseyNumber}` : ""}
                            {p.grade && ` • Grade ${p.grade}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (hasAccount) onEvaluate(p as any);
                          }}
                          disabled={!hasAccount}
                          className={hasAccount 
                            ? "text-blue-600 hover:text-blue-700 hover:bg-blue-50" 
                            : "text-gray-400 cursor-not-allowed"
                          }
                          data-testid={`button-evaluate-${playerId}`}
                        >
                          <Gauge className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (hasAccount) onReward(p as any);
                          }}
                          disabled={!hasAccount}
                          className={hasAccount 
                            ? "text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50" 
                            : "text-gray-400 cursor-not-allowed"
                          }
                          data-testid={`button-reward-${playerId}`}
                        >
                          <Trophy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="text-sm text-gray-500">No players in this team yet.</div>
        )}
      </div>

      {/* Team Chat */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-2">Team Chat</h4>
        <TeamChat teamId={selectedTeamId} currentProfileId={currentUser?.id} />
      </div>

      {/* Remove Player Confirmation Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent data-testid="dialog-remove-player-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Player from Team?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{playerToRemove?.name}</strong> from this team? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-remove">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (playerToRemove) {
                  removePlayerMutation.mutate(playerToRemove.id);
                  setRemoveDialogOpen(false);
                  setPlayerToRemove(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-remove"
            >
              Remove Player
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* Removed local dialog components - now using shared dialogs from CoachAwardDialogs */

/* ---------- Badges (BoxStat‑wide, unchanged) ---------- */
function BadgesTab() {
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerLite | null>(null);
  const [note, setNote] = useState("");
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const { data: badges = [] as Array<{ id: number; name: string; description?: string }> } = useQuery({
    queryKey: ["/api/badges/list"],
    queryFn: async () => {
      const res = await fetch("/api/badges/list", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: search = [] as PlayerLite[] } = useQuery({
    queryKey: ["/api/coach/players/search", q],
    enabled: q.trim().length >= 2,
    queryFn: async () => {
      const res = await fetch(`/api/coach/players/search?q=${encodeURIComponent(q)}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (badgeId: number) => {
      if (!selectedPlayer) throw new Error("Select a player first");
      const res = await fetch(`/api/coach/badges/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ playerId: selectedPlayer.id, badgeId, note }),
      });
      if (!res.ok) throw new Error("Failed to assign badge");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Badge assigned", description: selectedPlayer ? `${selectedPlayer.firstName} ${selectedPlayer.lastName}` : undefined });
      setNote("");
    },
    onError: (e: any) => toast({ title: "Couldn't assign", description: String(e?.message || e), variant: "destructive" }),
  });

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900">Badges (BoxStat‑wide)</h2>

      {/* Player search */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="text-sm text-gray-600">Search any player by name or email</div>
          <Input placeholder="Start typing…" value={q} onChange={(e) => setQ(e.target.value)} data-testid="input-search-player" />

          {q.trim().length >= 2 && (
            <div className="max-h-48 overflow-y-auto border rounded-md">
              {search.length ? (
                search.map((p: any, index: number) => (
                  <div key={`${p.id}-${index}`} className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 hover:bg-red-50" onClick={() => { setSelectedPlayer(p); setProfileModalOpen(true); }} data-testid={`player-result-${p.id}`}>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={p.profileImageUrl || undefined} />
                        <AvatarFallback className="text-[10px]">{p.firstName?.[0]}{p.lastName?.[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{p.firstName} {p.lastName}</div>
                        <div className="text-[11px] text-gray-500">{p.teamName || "—"}</div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                ))
              ) : (
                <div className="p-3 text-sm text-gray-500">No players found</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>


      {/* Player Profile Modal */}
      <PlayerProfileModal 
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        player={selectedPlayer}
        badges={badges}
        note={note}
        setNote={setNote}
        onAssignBadge={assignMutation.mutate}
        assigning={assignMutation.isPending}
      />
    </div>
  );
}

/* ---------- Player Profile Modal ---------- */
function PlayerProfileModal({
  open,
  onOpenChange,
  player,
  badges,
  note,
  setNote,
  onAssignBadge,
  assigning,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: PlayerLite | null;
  badges: Array<{ id: number; name: string; description?: string }>;
  note: string;
  setNote: (note: string) => void;
  onAssignBadge: (badgeId: number) => void;
  assigning: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"profile">("profile");

  if (!player) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={player.profileImageUrl || undefined} />
              <AvatarFallback className="text-lg">{player.firstName?.[0]}{player.lastName?.[0]}</AvatarFallback>
            </Avatar>
            <div>
              <div className="text-xl font-semibold">{player.firstName} {player.lastName}</div>
              <div className="text-sm text-gray-600">{player.teamName || "No team assigned"}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b">
          <Button 
            variant="default"
            className="rounded-b-none bg-red-600 hover:bg-red-700"
            data-testid="tab-profile"
          >
            <User className="h-4 w-4 mr-2" />
            View Profile
          </Button>
        </div>

        {/* Tab Content */}
        <div className="min-h-[300px]">
          {activeTab === "profile" && (
            <div className="space-y-4 py-4">
              {!(player as any).hasAppProfile ? (
                <div className="text-center py-8">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <div className="flex items-center justify-center mb-4">
                      <User className="h-12 w-12 text-yellow-600" />
                    </div>
                    <h3 className="text-lg font-medium text-yellow-800 mb-2">
                      Player has not set up a profile yet
                    </h3>
                    <p className="text-sm text-yellow-700 mb-4">
                      {player.firstName} {player.lastName} is in the Notion database but hasn't created an app account.
                    </p>
                    <div className="space-y-3 text-left">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Name (from Notion)</label>
                        <div className="text-gray-900">{player.firstName} {player.lastName}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Club Team (from Notion)</label>
                        <div className="text-gray-900">{(player as any).youthClubTeam || "No team assigned"}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">First Name</label>
                      <div className="text-gray-900">{player.firstName}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Last Name</label>
                      <div className="text-gray-900">{player.lastName}</div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Team</label>
                    <div className="text-gray-900">{player.teamName || "No team assigned"}</div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">Club Team (from Notion)</label>
                    <div className="text-gray-900">{(player as any).youthClubTeam || "No club team"}</div>
                  </div>

                  {(player as any).email && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Email</label>
                      <div className="text-gray-900">{(player as any).email}</div>
                    </div>
                  )}

                  {(player as any).grade && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Grade</label>
                      <div className="text-gray-900">{(player as any).grade}</div>
                    </div>
                  )}

                  {(player as any).position && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Position</label>
                      <div className="text-gray-900">{(player as any).position}</div>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <div className="text-center text-sm text-gray-500">
                      Additional player details and performance history would appear here
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-close-modal">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Pay Tab ---------- */
function PayTab({ pay, onOpenPortal }: { pay?: CoachPaySummary; onOpenPortal: () => void }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Pay</h2>
        <Badge variant="outline" className="text-xs">Coming Soon</Badge>
      </div>

      <Card className="border-0 shadow-sm opacity-50">
        <CardContent className="p-4">
          <div className="text-center py-8">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Payroll Portal</h3>
            <p className="text-sm text-gray-500">
              Coach payroll and compensation management will be available here soon.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- HR Tab ---------- */
function HRTab({ 
  docs, 
  announcements, 
  showLeadEvaluation, 
  setShowLeadEvaluation,
  currentUser 
}: { 
  docs: Array<{ id: string | number; title: string; url: string }>; 
  announcements: Array<{ id: string | number; title: string; body: string; createdAt: string }>;
  showLeadEvaluation: boolean;
  setShowLeadEvaluation: (show: boolean) => void;
  currentUser: UserType;
}) {
  
  // If showing lead evaluation form, render it instead of default HR content
  if (showLeadEvaluation) {
    return <LeadEvaluationForm onClose={() => setShowLeadEvaluation(false)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">HR & Training</h2>
        <Button 
          onClick={() => setShowLeadEvaluation(true)}
          className="bg-red-600 hover:bg-red-700"
          data-testid="button-lead-evaluation"
        >
          <Users className="h-4 w-4 mr-2" />
          New Lead Evaluation
        </Button>
      </div>

      {/* Coaching Card */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Award className="h-5 w-5 text-red-600" />
            <h3 className="text-md font-bold text-gray-900">Coaching Profile</h3>
          </div>
          <div className="space-y-3">
            {(currentUser as any)?.yearsExperience && (
              <div>
                <div className="text-xs font-semibold text-gray-600 mb-1">Experience Level</div>
                <div className="text-sm text-gray-900">{(currentUser as any).yearsExperience}</div>
              </div>
            )}
            {(currentUser as any)?.bio && (
              <div>
                <div className="text-xs font-semibold text-gray-600 mb-1">Coaching Bio</div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">{(currentUser as any).bio}</div>
              </div>
            )}
            {(currentUser as any)?.previousTeams && (
              <div>
                <div className="text-xs font-semibold text-gray-600 mb-1">Previous Teams</div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">{(currentUser as any).previousTeams}</div>
              </div>
            )}
            {(currentUser as any)?.playingExperience && (
              <div>
                <div className="text-xs font-semibold text-gray-600 mb-1">Playing Experience</div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">{(currentUser as any).playingExperience}</div>
              </div>
            )}
            {(currentUser as any)?.philosophy && (
              <div>
                <div className="text-xs font-semibold text-gray-600 mb-1">Coaching Philosophy</div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">{(currentUser as any).philosophy}</div>
              </div>
            )}
            {!(currentUser as any)?.yearsExperience && !(currentUser as any)?.bio && !(currentUser as any)?.previousTeams && !(currentUser as any)?.playingExperience && !(currentUser as any)?.philosophy && (
              <div className="text-sm text-gray-500">No coaching information added yet. Update your profile in settings.</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Training Documents - Greyed Out */}
      <Card className="border-0 shadow-sm opacity-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-md font-bold text-gray-900">Training Documents</h3>
            <Badge variant="outline" className="text-xs">Coming Soon</Badge>
          </div>
          <div className="text-sm text-gray-500">Training documents will be available here soon.</div>
        </CardContent>
      </Card>

    </div>
  );
}