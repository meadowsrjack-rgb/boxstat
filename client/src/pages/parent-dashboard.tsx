import { motion } from "framer-motion";
import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Search,
  Calendar as CalendarIcon,
  Users,
  Megaphone,
  Trash2,
} from "lucide-react";

// ==============================
// Types & API
// ==============================
type UypEvent = {
  id: string;
  title: string;
  startTime: string;
  endTime?: string;
  location?: string;
  eventType?: "Practice" | "Skills" | "Game" | "Other";
  teamTags?: string[];
};

type Player = {
  id: string;
  name: string;
  number?: number;
  team?: string;
  position?: string;
  avatarUrl?: string;
};

type Announcement = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  audience: "All" | "Parents" | "Coaches" | "Players" | "Team";
};

// API adapter functions to work with existing endpoints
const API = {
  parents: {
    followedPlayers: "/api/parent/follows",
    follow: (playerId: string) => `/api/parent/follows/${playerId}`,
    unfollow: (playerId: string) => `/api/parent/follows/${playerId}`,
    events: "/api/users/me/events",
    announcements: "/api/announcements",
  },
  players: {
    search: (q: string) => `/api/players/search?q=${encodeURIComponent(q)}`,
  },
};

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...init,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} ${res.statusText}: ${msg}`);
  }
  return res.json();
}

function formatDateRange(startISO: string, endISO?: string) {
  const start = new Date(startISO);
  const end = endISO ? new Date(endISO) : null;
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" };
  if (!end) return start.toLocaleString(undefined, opts);
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) {
    const d = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const s = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    const e = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    return `${d} • ${s}–${e}`;
  }
  const sFull = start.toLocaleString(undefined, opts);
  const eFull = end.toLocaleString(undefined, opts);
  return `${sFull} → ${eFull}`;
}

// ==============================
// Shared UI Components
// ==============================
const cardVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

function GradientHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-sky-600 to-teal-500 p-[1px] shadow-lg">
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/80 to-slate-900/60 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-slate-300">{subtitle}</p> : null}
          </div>
          <CalendarIcon className="h-7 w-7 text-slate-200" />
        </div>
      </div>
    </div>
  );
}

function StatPill({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-slate-800/60 px-4 py-2 text-slate-200 ring-1 ring-white/10">
      <Icon className="h-4 w-4" />
      <span className="text-xs/5 uppercase tracking-wide text-slate-300">{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}

function EventChip({ evt }: { evt: UypEvent }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-800/60 p-3 ring-1 ring-white/10">
      <div>
        <p className="text-sm font-medium text-white">{evt.title}</p>
        <p className="text-xs text-slate-400">{formatDateRange(evt.startTime, evt.endTime)}{evt.location ? ` • ${evt.location}` : ""}</p>
      </div>
      <Badge variant="secondary" className="bg-sky-600/20 text-sky-100">
        {evt.eventType || "Event"}
      </Badge>
    </div>
  );
}

function EmptyState({ icon: Icon, title, hint }: { icon: any; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 p-10 text-center text-slate-400">
      <Icon className="h-8 w-8 text-slate-500" />
      <p className="font-medium text-slate-200">{title}</p>
      {hint ? <p className="text-sm text-slate-400">{hint}</p> : null}
    </div>
  );
}

// ==============================
// Parent Dashboard
// ==============================
export default function ParentDashboard() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [notify, setNotify] = useState(true);

  const followedPlayersQ = useQuery<Player[]>({
    queryKey: ["parent","follows"],
    queryFn: () => jsonFetch(API.parents.followedPlayers),
  });

  const eventsQ = useQuery<UypEvent[]>({
    queryKey: ["parent","events"],
    queryFn: () => jsonFetch(API.parents.events),
  });

  const announcementsQ = useQuery<Announcement[]>({
    queryKey: ["parent","announcements"],
    queryFn: () => jsonFetch(API.parents.announcements),
  });

  const searchQ = useQuery<Player[]>({
    queryKey: ["parent","search", query],
    queryFn: () => jsonFetch(API.players.search(query)),
    enabled: query.trim().length > 1,
  });

  const followMut = useMutation({
    mutationFn: async (playerId: string) => jsonFetch(API.parents.follow(playerId), { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parent","follows"] });
      qc.invalidateQueries({ queryKey: ["parent","events"] });
    },
  });

  const unfollowMut = useMutation({
    mutationFn: async (playerId: string) => jsonFetch(API.parents.unfollow(playerId), { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parent","follows"] });
      qc.invalidateQueries({ queryKey: ["parent","events"] });
    },
  });

  const upcoming = useMemo(() => (eventsQ.data || []).slice().sort((a,b)=>+new Date(a.startTime)-+new Date(b.startTime)).slice(0,6), [eventsQ.data]);

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <GradientHeader title="Parent Dashboard" subtitle="Follow your players and never miss an event." />

      {/* Top Stats */}
      <div className="mb-6 flex flex-wrap gap-2">
        <StatPill label="Following" value={followedPlayersQ.data?.length ?? 0} icon={Users} />
        <StatPill label="Upcoming" value={upcoming.length} icon={CalendarIcon} />
        <StatPill label="Announcements" value={announcementsQ.data?.length ?? 0} icon={Megaphone} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: Followed Players & Search */}
        <motion.div variants={cardVariants} initial="hidden" animate="show" className="lg:col-span-1">
          <Card className="border-white/10 bg-slate-900/60 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Users className="h-5 w-5" /> Followed Players
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 rounded-xl bg-slate-800/60 p-2 ring-1 ring-white/10">
                <Search className="ml-2 h-4 w-4 text-slate-400" />
                <Input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search players to follow…" className="border-0 bg-transparent text-white placeholder:text-slate-500 focus-visible:ring-0" />
              </div>
              
              {query.trim().length > 1 ? (
                <div className="space-y-2">
                  {searchQ.isLoading ? <p className="text-sm text-slate-400">Searching…</p> : null}
                  {(searchQ.data || []).map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-xl bg-slate-800/60 p-3 ring-1 ring-white/10">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-sky-600 to-teal-500" />
                        <div>
                          <p className="text-sm font-medium text-white">{p.name}{typeof p.number === 'number' ? ` #${p.number}` : ''}</p>
                          <p className="text-xs text-slate-400">{p.team || "Unassigned"}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="secondary" className="bg-sky-600/20 text-sky-100 hover:bg-sky-600/30" onClick={() => followMut.mutate(p.id)}>
                        Follow
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="space-y-2">
                {(followedPlayersQ.data || []).length === 0 ? (
                  <EmptyState icon={Users} title="No followed players yet" hint="Search by name and tap Follow." />
                ) : (
                  (followedPlayersQ.data || []).map((p)=> (
                    <div key={p.id} className="flex items-center justify-between rounded-xl bg-slate-800/60 p-3 ring-1 ring-white/10">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-600 to-sky-500" />
                        <div>
                          <p className="text-sm font-medium text-white">{p.name}{typeof p.number === 'number' ? ` #${p.number}` : ''}</p>
                          <p className="text-xs text-slate-400">{p.team || "Unassigned"}</p>
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" className="text-slate-300 hover:text-white" onClick={() => unfollowMut.mutate(p.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-center justify-between rounded-xl bg-slate-800/60 p-3 ring-1 ring-white/10">
                <div>
                  <p className="text-sm font-medium text-white">Notifications</p>
                  <p className="text-xs text-slate-400">Get alerts for followed players' events</p>
                </div>
                <Switch checked={notify} onCheckedChange={setNotify} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Middle: Upcoming Events */}
        <motion.div variants={cardVariants} initial="hidden" animate="show" className="lg:col-span-1">
          <Card className="border-white/10 bg-slate-900/60 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <CalendarIcon className="h-5 w-5" /> Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcoming.length === 0 ? (
                <EmptyState icon={CalendarIcon} title="No upcoming events" hint="Events for followed players will appear here." />
              ) : (
                upcoming.map((evt) => <EventChip key={evt.id} evt={evt} />)
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Right: Announcements */}
        <motion.div variants={cardVariants} initial="hidden" animate="show" className="lg:col-span-1">
          <Card className="border-white/10 bg-slate-900/60 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Megaphone className="h-5 w-5" /> Announcements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(announcementsQ.data || []).length === 0 ? (
                <EmptyState icon={Megaphone} title="No announcements" />
              ) : (
                announcementsQ.data!.map((a) => (
                  <div key={a.id} className="rounded-xl bg-slate-800/60 p-3 ring-1 ring-white/10">
                    <p className="text-sm font-semibold text-white">{a.title}</p>
                    <p className="mt-1 text-xs text-slate-400">{new Date(a.createdAt).toLocaleString()}</p>
                    <p className="mt-2 text-sm text-slate-300">{a.content}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}