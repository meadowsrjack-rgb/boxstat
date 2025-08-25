"use client";

import { useAuth } from "@/hooks/useAuth";
import PlayerCalendar from "@/components/PlayerCalendar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import type { User as UserType, Event } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Bell,
  MoreHorizontal,
  Calendar as CalendarIcon,
  Users,
  Gauge,
  Trophy,
  DollarSign,
  FileText,
  Send,
  UserCheck,
  ChevronRight,
  MapPin,
  Copy,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { format, isSameDay, isAfter, startOfDay } from "date-fns";

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

type BadgeDef = { id: number; name: string; description?: string };

type PlayerLite = {
  id: number;
  firstName: string;
  lastName: string;
  teamName?: string | null;
  profileImageUrl?: string | null;
};

/* For quarterly skill evals */
const SKILL_KEYS = ["SHOOTING", "DRIBBLING", "PASSING"] as const;
type SkillKey = typeof SKILL_KEYS[number];

type Quarter = "Q1" | "Q2" | "Q3" | "Q4";

/* =================== Component =================== */
export default function CoachDashboard() {
  const { user } = useAuth();
  const currentUser = user as UserType | null;
  const [activeTab, setActiveTab] = useState<
    "calendar" | "roster" | "evaluate" | "badges" | "pay" | "hr"
  >(() => (typeof window === "undefined" ? "calendar" : ((localStorage.getItem("coachDashboardTab") as any) || "calendar")));
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const sendTeamMessage = useMutation({
    mutationFn: async (message: string) => {
      const res = await fetch(`/api/teams/${coachTeam?.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message, messageType: "text" }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Message sent" });
      queryClient.invalidateQueries({ queryKey: ["/api/teams", coachTeam?.id, "messages"] });
    },
  });

  const openPayrollPortal = async () => {
    try {
      const res = await fetch("/api/coach/pay/portal", { method: "POST", credentials: "include" });
      const j = await res.json();
      if (j?.url) window.location.href = j.url;
      else toast({ title: "Couldn't open portal", variant: "destructive" });
    } catch (e) {
      toast({ title: "Portal error", variant: "destructive" });
    }
  };

  const initials = `${(currentUser.firstName || "").charAt(0)}${(currentUser.lastName || "").charAt(0)}`.toUpperCase();

  /* Simple summaries for calendar tab */
  const todayEvents = useMemo(() => {
    const today = new Date();
    return coachEvents.filter((ev) => isSameDay(new Date((ev as any).startTime || (ev as any).start_time), today));
  }, [coachEvents]);

  const upcomingEvents = useMemo(() => {
    const start = startOfDay(new Date());
    return coachEvents
      .filter((ev) => isAfter(new Date((ev as any).startTime || (ev as any).start_time), start))
      .filter((ev) => !isSameDay(new Date((ev as any).startTime || (ev as any).start_time), new Date()))
      .slice(0, 3);
  }, [coachEvents]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <header className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-end">
            <Button variant="ghost" size="icon" className="h-12 w-12" aria-label="Notifications">
              <Bell className="h-12 w-12" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12"
              onClick={() => setLocation("/settings")}
              aria-label="Settings"
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
            <ProfileAvatarRing src={currentUser.profileImageUrl} initials={initials} size={88} />
          </div>
          <div className="text-sm text-gray-600">
            Coach <span className="font-semibold text-gray-900">{currentUser.firstName}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 mb-6">
          <div className="flex justify-between items-center">
            <TabButton label="calendar" activeTab={activeTab} onClick={setActiveTab} Icon={CalendarIcon} />
            <TabButton label="roster" activeTab={activeTab} onClick={setActiveTab} Icon={Users} />
            <TabButton label="evaluate" activeTab={activeTab} onClick={setActiveTab} Icon={Gauge} />
            <TabButton label="badges" activeTab={activeTab} onClick={setActiveTab} Icon={Trophy} />
            <TabButton label="pay" activeTab={activeTab} onClick={setActiveTab} Icon={DollarSign} />
            <TabButton label="hr" activeTab={activeTab} onClick={setActiveTab} Icon={FileText} />
          </div>
        </div>

        {/* Content */}
        <div className="px-6">
          {activeTab === "calendar" && (
            <div className="-mx-6">
              <PlayerCalendar events={coachEvents as any} currentUser={{...currentUser, email: currentUser.email || ''}} />

              <div className="px-6 py-6 space-y-4">
                <section className="space-y-2">
                  <h3 className="text-lg font-bold text-gray-900">Today</h3>
                  {todayEvents.length ? (
                    todayEvents.map((event) => (
                      <div key={event.id} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 text-sm">{(event as any).title || (event as any).summary || "Session"}</h4>
                          <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                            <span>{format(new Date((event as any).startTime || (event as any).start_time), "h:mm a")}</span>
                            {(event as any).location && (
                              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{(event as any).location}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500">No sessions today.</div>
                  )}
                </section>

                <section className="space-y-2">
                  <h3 className="text-lg font-bold text-gray-900">Upcoming</h3>
                  {upcomingEvents.length ? (
                    upcomingEvents.map((event) => (
                      <div key={event.id} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 text-sm">{(event as any).title || (event as any).summary || "Session"}</h4>
                          <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                            <span>{format(new Date((event as any).startTime || (event as any).start_time), "EEE, MMM d • h:mm a")}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500">No upcoming sessions.</div>
                  )}
                </section>
              </div>
            </div>
          )}

          {activeTab === "roster" && (
            <RosterTab team={coachTeam || undefined} messages={teamMessages} onSend={(m) => sendTeamMessage.mutate(m)} />
          )}

          {activeTab === "evaluate" && coachTeam && (
            <EvaluateTab team={coachTeam} />
          )}

          {activeTab === "badges" && (
            <BadgesTab teamId={coachTeam?.id} />
          )}

          {activeTab === "pay" && (
            <PayTab pay={paySummary || undefined} onOpenPortal={openPayrollPortal} />
          )}

          {activeTab === "hr" && (
            <HRTab docs={hrDocs} announcements={hrAnnouncements} />
          )}
        </div>
      </main>
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

/* ---------- Roster & Team Messages ---------- */
function RosterTab({ team, messages, onSend }: { team?: CoachTeam | null; messages: any[]; onSend: (m: string) => void }) {
  const [msg, setMsg] = useState("");
  const { toast } = useToast();

  if (!team) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6 text-center text-sm text-gray-500">No team assigned yet.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">My Team</h2>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center">
                <Users className="h-8 w-8 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-lg">{team.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{team.ageGroup}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <UserCheck className="h-4 w-4" /> You are the coach
                </div>
              </div>
              {team.inviteCode ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(team.inviteCode!);
                    toast({ title: "Invite code copied" });
                  }}
                >
                  <Copy className="h-3.5 w-3.5 mr-1" /> Invite
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Roster list */}
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-gray-900">Roster</h3>
        {team.roster?.length ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <div className="max-h-72 overflow-y-auto">
                {team.roster.map((p) => (
                  <div key={p.id} className="p-4 border-b border-gray-100 last:border-b-0 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={p.profileImageUrl} />
                        <AvatarFallback className="text-xs">{p.firstName?.[0]}{p.lastName?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="truncate">
                        <div className="font-medium text-gray-900 truncate">{p.firstName} {p.lastName}</div>
                        <div className="text-xs text-gray-500">{p.position || "Player"}{p.jerseyNumber != null ? ` • #${p.jerseyNumber}` : ""}</div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => (window.location.href = `/players/${p.id}`)}>View</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="text-sm text-gray-500">No players yet.</div>
        )}
      </div>

      {/* Team messages */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Team Messages</h3>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="space-y-4 max-h-64 overflow-y-auto">
              {messages?.length ? (
                messages.map((m) => (
                  <div key={m.id} className="flex space-x-3 py-3 border-b border-gray-100 last:border-b-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={m.sender?.profileImageUrl} />
                      <AvatarFallback className="bg-red-100 text-red-600">
                        {m.sender?.firstName?.[0]}{m.sender?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">{m.sender?.firstName} {m.sender?.lastName}</p>
                        <p className="text-xs text-gray-500">{m.createdAt ? format(new Date(m.createdAt), "MMM d, h:mm a") : "Now"}</p>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{m.message}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Sparkles className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                  No messages yet.
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex gap-2">
                <Input placeholder="Type a message…" value={msg} onChange={(e) => setMsg(e.target.value)} className="flex-1" />
                <Button size="icon" disabled={!msg.trim()} onClick={() => { onSend(msg.trim()); setMsg(""); }}>
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

/* ---------- Quarterly Evaluations ---------- */
function EvaluateTab({ team }: { team: CoachTeam }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [quarter, setQuarter] = useState<Quarter>(() => {
    const m = new Date().getMonth();
    return (m <= 2 ? "Q1" : m <= 5 ? "Q2" : m <= 8 ? "Q3" : "Q4") as Quarter;
  });

  type PlayerScores = Record<SkillKey, number>;
  const [scores, setScores] = useState<Record<number, PlayerScores>>({});

  /* Load existing */
  const { isFetching } = useQuery({
    queryKey: ["/api/coach/evaluations", team.id, quarter, year],
    queryFn: async () => {
      const res = await fetch(`/api/coach/evaluations?teamId=${team.id}&quarter=${quarter}&year=${year}`, { credentials: "include" });
      if (!res.ok) return {} as Record<number, PlayerScores>;
      const j = await res.json();
      // j = { [playerId]: { SHOOTING: 80, ... } }
      setScores(j || {});
      return j;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { teamId: team.id, quarter, year, scores };
      const res = await fetch(`/api/coach/evaluations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save evaluations");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Evaluations saved" });
      queryClient.invalidateQueries({ queryKey: ["/api/coach/evaluations", team.id, quarter, year] });
    },
    onError: (e: any) => toast({ title: "Save failed", description: String(e?.message || e), variant: "destructive" }),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Quarterly Skill Evaluations</h2>
        <div className="text-sm text-gray-500">{isFetching ? "Loading…" : null}</div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <label className="text-gray-600">Quarter</label>
              <select className="w-full border rounded-md px-2 py-1" value={quarter} onChange={(e) => setQuarter(e.target.value as Quarter)}>
                <option value="Q1">Q1</option>
                <option value="Q2">Q2</option>
                <option value="Q3">Q3</option>
                <option value="Q4">Q4</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-gray-600">Year</label>
              <input className="w-full border rounded-md px-2 py-1" type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value || String(new Date().getFullYear())))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roster grid with inputs */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="divide-y">
            {team.roster.map((p) => (
              <div key={p.id} className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={p.profileImageUrl} />
                    <AvatarFallback className="text-xs">{p.firstName?.[0]}{p.lastName?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="font-medium text-gray-900">{p.firstName} {p.lastName}</div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {SKILL_KEYS.map((k) => (
                    <div key={k} className="space-y-1">
                      <div className="text-[11px] font-semibold text-gray-500">{k}</div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={(scores[p.id]?.[k] ?? 0) as number}
                        onChange={(e) => {
                          const v = parseInt(e.target.value);
                          setScores((prev) => ({
                            ...prev,
                            [p.id]: { ...prev[p.id], [k]: v } as any,
                          }));
                        }}
                      />
                      <div className="text-xs text-gray-700">{scores[p.id]?.[k] ?? 0}%</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Top</Button>
        <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Saving…" : "Save All"}
        </Button>
      </div>
    </div>
  );
}

/* ---------- Badges (UYP‑wide) ---------- */
function BadgesTab({ teamId }: { teamId?: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerLite | null>(null);
  const [note, setNote] = useState("");

  const { data: badges = [] as BadgeDef[] } = useQuery({
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
          <Input placeholder="Start typing…" value={q} onChange={(e) => setQ(e.target.value)} />

          {q.trim().length >= 2 && (
            <div className="max-h-48 overflow-y-auto border rounded-md">
              {search.length ? (
                search.map((p) => (
                  <div key={p.id} className={`p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 ${selectedPlayer?.id === p.id ? "bg-red-50" : ""}`} onClick={() => setSelectedPlayer(p)}>
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
                    {selectedPlayer?.id === p.id ? <Badge className="bg-green-100 text-green-700">Selected</Badge> : null}
                  </div>
                ))
              ) : (
                <div className="p-3 text-sm text-gray-500">No players found</div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <div className="text-sm text-gray-600">Optional note</div>
            <Input placeholder="e.g., Leadership in practice this week" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Badge list */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-3">
            {badges.map((b) => (
              <Button key={b.id} variant="outline" className="justify-start h-auto py-3" onClick={() => assignMutation.mutate(b.id)} disabled={!selectedPlayer || assignMutation.isPending}>
                <Trophy className="h-4 w-4 mr-2" />
                <div className="text-left">
                  <div className="text-sm font-semibold text-gray-900">{b.name}</div>
                  {b.description ? <div className="text-xs text-gray-500">{b.description}</div> : null}
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick: assign to roster players */}
      {teamId ? <QuickRosterBadgeAssign teamId={teamId} onAssign={(pid, bid) => assignMutation.mutate(bid)} /> : null}
    </div>
  );
}

function QuickRosterBadgeAssign({ teamId, onAssign }: { teamId: number; onAssign: (playerId: number, badgeId: number) => void }) {
  const { data: roster = [] as PlayerLite[] } = useQuery({
    queryKey: ["/api/coach/team/roster", teamId],
    queryFn: async () => {
      const res = await fetch(`/api/coach/team?onlyRoster=1`, { credentials: "include" });
      if (!res.ok) return [];
      const j = await res.json();
      return j?.roster || [];
    },
  });
  const { data: badges = [] as BadgeDef[] } = useQuery({
    queryKey: ["/api/badges/list"],
  });

  if (!roster.length) return null;

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4 space-y-3">
        <h3 className="text-md font-bold text-gray-900">Quick Assign (Roster)</h3>
        {roster.map((p) => (
          <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
            <div className="flex items-center gap-3">
              <Avatar className="h-7 w-7">
                <AvatarImage src={p.profileImageUrl || undefined} />
                <AvatarFallback className="text-[10px]">{p.firstName?.[0]}{p.lastName?.[0]}</AvatarFallback>
              </Avatar>
              <div className="text-sm font-medium text-gray-900">{p.firstName} {p.lastName}</div>
            </div>
            <div className="flex gap-2">
              {badges.slice(0, 3).map((b) => (
                <Button key={`${p.id}-${b.id}`} size="sm" variant="outline" onClick={() => onAssign(p.id, b.id)}>
                  {b.name}
                </Button>
              ))}
              <Button size="sm" variant="ghost" onClick={() => (window.location.href = `/players/${p.id}`)}>More</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
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
              <div className="mt-1">{statusBadge(pay?.status)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Next pay date</div>
              <div className="font-semibold text-gray-900">{pay?.nextPayDate ? format(new Date(pay.nextPayDate), "MMM d, yyyy") : "—"}</div>
              <div className="mt-3 text-sm text-gray-500">Amount</div>
              <div className="font-semibold text-gray-900">{amt ?? "—"}</div>
            </div>
          </div>

          <div className="mt-4">
            <Button className="w-full bg-red-600 hover:bg-red-700" onClick={onOpenPortal}>
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
function HRTab({ docs, announcements }: { docs: Array<{ id: string | number; title: string; url: string }>; announcements: Array<{ id: string | number; title: string; body: string; createdAt: string }> }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">HR & Training</h2>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <h3 className="text-md font-bold text-gray-900 mb-3">Training Documents</h3>
          {docs?.length ? (
            <div className="space-y-2">
              {docs.map((d) => (
                <a key={d.id} href={d.url} target="_blank" className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50">
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
                <div key={a.id} className="p-3 rounded-lg border">
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