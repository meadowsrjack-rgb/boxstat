"use client";

import { useAuth } from "@/hooks/useAuth";
import PlayerCalendar from "@/components/PlayerCalendar";
import EventDetailPanel from "@/components/EventDetailPanel";
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
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
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
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { format, isSameDay, isAfter, startOfDay } from "date-fns";
import PlayerSearch from "@/components/PlayerSearch";
import PlayerCard from "@/components/PlayerCard";
import TeamChat from "@/components/TeamChat";
import LeadEvaluationForm from "@/components/LeadEvaluationForm";
import { AwardsDialog, EvaluationDialog, SKILL_CATEGORIES, TEAM_TROPHIES, COACH_AWARDS, type PlayerLite, type EvalScores, type Quarter, type SkillCategoryName } from "@/components/CoachAwardDialogs";

/* =================== Types =================== */

type UypEvent = Event;

type CoachTeam = {
  id: number;
  name: string;
  ageGroup?: string;
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
    queryKey: [`/api/coaches/${currentUser?.id}/teams`],
    enabled: !!currentUser?.id,
    queryFn: async () => {
      const res = await fetch(`/api/coaches/${currentUser?.id}/teams`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Query for all teams (for filter dropdown - used for universal team search)
  const { data: allTeams = [] } = useQuery<Array<{id: string; name: string; ageGroup?: string}>>({
    queryKey: ["/api/search/teams"],
    queryFn: async () => {
      const res = await fetch("/api/search/teams", { credentials: "include" });
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
    queryKey: [`/api/coaches/${currentUser?.id}/players`],
    enabled: !!currentUser?.id,
    queryFn: async () => {
      const res = await fetch(`/api/coaches/${currentUser?.id}/players`, { credentials: "include" });
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

  const { data: teamMessages = [] } = useQuery<any[]>({
    queryKey: ["/api/teams", coachTeam?.id, "messages"],
    enabled: !!coachTeam?.id,
    queryFn: async () => {
      const res = await fetch(`/api/teams/${coachTeam?.id}/messages`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: coachEvents = [] as UypEvent[] } = useQuery<UypEvent[]>({
    queryKey: ["/api/coach/events"],
    queryFn: async () => {
      const res = await fetch("/api/coach/events", { credentials: "include" });
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
      const res = await fetch(`/api/coach/evaluations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save evaluation");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Evaluation saved" });
      queryClient.invalidateQueries({ queryKey: querySaveKey });
      setEvalOpen(false);
      setScores({});
      setSelectedPlayer(null);
    },
    onError: (e: any) => toast({ title: "Save failed", description: String(e?.message || e), variant: "destructive" }),
  });

  const awardMutation = useMutation({
    mutationFn: async ({ awardId, kind }: { awardId: string; kind: "badge" | "trophy" }) => {
      if (!selectedPlayer) throw new Error("No player selected");
      const res = await fetch(`/api/coach/award`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ playerId: selectedPlayer.id, awardId, category: kind }),
      });
      if (!res.ok) throw new Error("Failed to give award");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Award given" });
      // Invalidate cache for the awarded player's badges and trophies
      if (selectedPlayer) {
        queryClient.invalidateQueries({ queryKey: [`/api/users/${selectedPlayer.id}/badges`] });
        queryClient.invalidateQueries({ queryKey: [`/api/users/${selectedPlayer.id}/trophies`] });
      }
      setAwardsOpen(false);
      setSelectedPlayer(null);
    },
    onError: () => toast({ title: "Failed to give award", variant: "destructive" }),
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

  // Filter for unread join request notifications
  const unreadJoinRequests = notifications.filter(
    (n: any) => n.type === "team_join_request" && !n.isRead
  );

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
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <header className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-end gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-12 w-12 text-gray-700 hover:text-gray-900 hover:bg-gray-100 relative" aria-label="Notifications" data-testid="button-notifications">
                  <Bell className="h-6 w-6" />
                  {unreadJoinRequests.length > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-600 text-white text-xs" data-testid="notification-badge">
                      {unreadJoinRequests.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                {unreadJoinRequests.length > 0 ? (
                  <div className="max-h-96 overflow-y-auto">
                    {unreadJoinRequests.map((notification: any) => (
                      <DropdownMenuItem
                        key={notification.id}
                        className="flex flex-col items-start p-3 cursor-pointer"
                        onClick={() => {
                          markAsReadMutation.mutate(notification.id);
                          setActiveTab("roster");
                        }}
                        data-testid={`notification-${notification.id}`}
                      >
                        <div className="font-medium text-sm">{notification.title}</div>
                        <div className="text-xs text-gray-500 mt-1">{notification.message}</div>
                      </DropdownMenuItem>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-sm text-gray-500 text-center">No new notifications</div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
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
      </header>

      {/* Main */}
      <main className="max-w-md mx-auto">
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
              messages={teamMessages}
              allTeams={allTeams}
              selectedTeamFilter={selectedTeamFilter}
              onTeamFilterChange={setSelectedTeamFilter}
              onSend={async (m) => {
                const teamId = selectedTeamFilter === 'my-team' ? coachTeam?.id : selectedTeamFilter;
                const res = await fetch(`/api/teams/${teamId}/messages`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({ message: m, messageType: "text" }),
                });
                if (!res.ok) toast({ title: "Failed to send", variant: "destructive" });
                else toast({ title: "Message sent" });
              }}

              onEvaluate={(p) => {
                setSelectedPlayer(p);
                // Load existing eval for player/quarter/year
                fetch(`/api/coach/evaluations?playerId=${p.id}&quarter=${quarter}&year=${year}`, { credentials: "include" })
                  .then((r) => (r.ok ? r.json() : null))
                  .then((data) => setScores((data as EvalScores) || {}));
                setEvalOpen(true);
              }}

              onReward={(p) => {
                setSelectedPlayer(p);
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
            />
          )}

          {/* Event Detail Modal */}
          <EventDetailPanel
            event={selectedEvent}
            userId={currentUser.id}
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

/* ---------- Roster Tab (with Evaluate/Reward buttons inline) ---------- */
function RosterTab({
  team,
  roster,
  assignedTeams,
  messages,
  allTeams,
  selectedTeamFilter,
  onTeamFilterChange,
  onSend,
  onEvaluate,
  onReward,
  selectedPlayerId,
  setSelectedPlayerId,
}: {
  team?: CoachTeam | null;
  roster: any[];
  assignedTeams: Array<{id: number; name: string; ageGroup: string}>;
  messages: any[];
  allTeams: Array<{id: string; name: string; ageGroup?: string}>;
  selectedTeamFilter: 'my-team' | number;
  onTeamFilterChange: (filter: 'my-team' | number) => void;
  onSend: (m: string) => void;
  onEvaluate: (p: PlayerLite) => void;
  onReward: (p: PlayerLite) => void;
  selectedPlayerId: string | null;
  setSelectedPlayerId: (id: string | null) => void;
}) {
  const { user } = useAuth();
  const currentUser = user as UserType;
  const [msg, setMsg] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pending join requests for the coach
  const { data: joinRequests = [] } = useQuery<any[]>({
    queryKey: [`/api/coaches/${currentUser?.id}/join-requests`],
    enabled: !!currentUser?.id,
  });

  // Approve join request mutation
  const approveMutation = useMutation({
    mutationFn: async (requestId: number) => {
      return apiRequest(`/api/join-requests/${requestId}`, {
        method: "PATCH",
        data: { action: "approve" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/coaches/${currentUser?.id}/join-requests`] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: "Success", description: "Player added to team!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to approve request", variant: "destructive" });
    },
  });

  // Reject join request mutation
  const rejectMutation = useMutation({
    mutationFn: async (requestId: number) => {
      return apiRequest(`/api/join-requests/${requestId}`, {
        method: "PATCH",
        data: { action: "reject" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/coaches/${currentUser?.id}/join-requests`] });
      toast({ title: "Request rejected" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reject request", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      {/* Join Requests Panel */}
      {joinRequests.length > 0 && (
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-900">Join Requests</h3>
            <p className="text-sm text-gray-500">Players requesting to join your team</p>
          </div>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {joinRequests.map((request: any) => (
                  <div key={request.id} className="p-4 flex items-center justify-between" data-testid={`join-request-${request.id}`}>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={request.player?.profileImageUrl} />
                        <AvatarFallback className="text-sm">
                          {request.player?.firstName?.[0]}{request.player?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-gray-900">
                          {request.player?.firstName} {request.player?.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          Requesting: {request.team?.name}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-600 hover:bg-green-50"
                        onClick={() => approveMutation.mutate(request.id)}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        data-testid={`button-approve-${request.id}`}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-600 hover:bg-red-50"
                        onClick={() => rejectMutation.mutate(request.id)}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        data-testid={`button-reject-${request.id}`}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Player Search */}
      <div>
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-900">Search Players</h3>
        </div>
        <PlayerSearch
          onPlayerSelect={(player) => setSelectedPlayerId(player.id)}
          placeholder="Search for players across all teams..."
        />
      </div>
      
      {/* Roster list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Roster</h3>
          {team && selectedTeamFilter === 'my-team' && team.inviteCode && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(team.inviteCode!);
                toast({ title: "Invite code copied" });
              }}
              data-testid="button-copy-invite"
            >
              <Copy className="h-3.5 w-3.5 mr-1" /> Invite
            </Button>
          )}
        </div>
        {roster?.length ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <div className="max-h-72 overflow-y-auto">
                {roster.map((p) => (
                  <div key={p.id} className="p-4 border-b border-gray-100 last:border-b-0 flex items-center justify-between" data-testid={`player-${p.id}`}>
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={p.profileImageUrl} />
                        <AvatarFallback className="text-xs">{p.firstName?.[0]}{p.lastName?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="truncate">
                        <div className="font-medium text-gray-900 truncate" data-testid={`text-player-name-${p.id}`}>{p.firstName} {p.lastName}</div>
                        <div className="text-xs text-gray-500">{p.position || "Player"}{p.jerseyNumber != null ? ` • #${p.jerseyNumber}` : ""}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Evaluate (quarterly) */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEvaluate(p as any)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        data-testid={`button-evaluate-${p.id}`}
                      >
                        <Gauge className="h-4 w-4" />
                      </Button>
                      {/* Reward (trophy/badge) */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onReward(p as any)}
                        className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                        data-testid={`button-reward-${p.id}`}
                      >
                        <Trophy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="text-sm text-gray-500">No players yet.</div>
        )}
      </div>

      {/* Team Chat */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Team Chat</h3>
        {selectedTeamFilter === 'my-team' ? (
          assignedTeams.length > 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Select a team from the filter above to view its chat.
                </p>
                <div className="grid gap-2">
                  {assignedTeams.map((team) => (
                    <Button
                      key={team.id}
                      variant="outline"
                      size="sm"
                      onClick={() => onTeamFilterChange(team.id)}
                      className="justify-start"
                      data-testid={`button-team-chat-${team.id}`}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      {team.name} ({team.ageGroup})
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="text-sm text-gray-500">No teams assigned yet.</div>
          )
        ) : (
          selectedTeamFilter && typeof selectedTeamFilter === 'number' ? (
            <TeamChat teamId={selectedTeamFilter} />
          ) : (
            <div className="text-sm text-gray-500">No team chat available.</div>
          )
        )}
      </div>
    </div>
  );
}

/* Removed local dialog components - now using shared dialogs from CoachAwardDialogs */

/* ---------- Badges (UYP‑wide, unchanged) ---------- */
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
      <h2 className="text-xl font-bold text-gray-900">Badges (UYP‑wide)</h2>

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
  const statusBadge = (s?: CoachPaySummary["status"]) => {
    switch (s) {
      case "paid":
        return <Badge className="bg-green-100 text-green-700">Paid</Badge>;
      case "upcoming":
        return <Badge className="bg-blue-100 text-blue-700">Upcoming</Badge>;
      case "processing":
        return <Badge className="bg-yellow-100 text-yellow-700">Processing</Badge>;
      case "on_hold":
        return <Badge className="bg-orange-100 text-orange-700">On hold</Badge>;
      case "past_due":
        return <Badge className="bg-red-100 text-red-700">Past due</Badge>;
      default:
        return <Badge variant="secondary">—</Badge>;
    }
  };
  const currency = (pay?.currency || "usd").toUpperCase();
  const amt = pay?.nextPayAmountCents != null ? (pay.nextPayAmountCents / 100).toLocaleString(undefined, { style: "currency", currency }) : null;

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900">Pay</h2>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-gray-500">Status</div>
              <div className="mt-1" data-testid="status-pay">{statusBadge(pay?.status)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Next pay date</div>
              <div className="font-semibold text-gray-900" data-testid="text-next-pay-date">{pay?.nextPayDate ? format(new Date(pay.nextPayDate), "MMM d, yyyy") : "—"}</div>
              <div className="mt-3 text-sm text-gray-500">Amount</div>
              <div className="font-semibold text-gray-900" data-testid="text-pay-amount">{amt ?? "—"}</div>
            </div>
          </div>

          <div className="mt-4">
            <Button className="w-full bg-red-600 hover:bg-red-700" onClick={onOpenPortal} data-testid="button-open-payroll">
              <DollarSign className="h-4 w-4 mr-2" /> Open Payroll Portal
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="text-sm text-gray-600">Need to update your tax or banking info? Use the payroll portal above.</div>
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
  setShowLeadEvaluation 
}: { 
  docs: Array<{ id: string | number; title: string; url: string }>; 
  announcements: Array<{ id: string | number; title: string; body: string; createdAt: string }>;
  showLeadEvaluation: boolean;
  setShowLeadEvaluation: (show: boolean) => void;
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

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <h3 className="text-md font-bold text-gray-900 mb-3">Training Documents</h3>
          {docs?.length ? (
            <div className="space-y-2">
              {docs.map((d) => (
                <a key={d.id} href={d.url} target="_blank" className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50" data-testid={`link-doc-${d.id}`}>
                  <div className="text-sm font-medium text-gray-900">{d.title}</div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </a>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500">No documents available.</div>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <h3 className="text-md font-bold text-gray-900 mb-3">Announcements</h3>
          {announcements?.length ? (
            <div className="space-y-3">
              {announcements.map((a) => (
                <div key={a.id} className="p-3 rounded-lg border" data-testid={`announcement-${a.id}`}>
                  <div className="text-sm font-semibold text-gray-900">{a.title}</div>
                  <div className="text-[11px] text-gray-500 mb-1">{a.createdAt ? format(new Date(a.createdAt), "MMM d, yyyy") : ""}</div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">{a.body}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500">No announcements yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}