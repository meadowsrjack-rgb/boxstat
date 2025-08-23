import { motion } from "framer-motion";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Calendar as CalendarIcon,
  Users,
  Award,
  Plus,
  Settings,
  Megaphone,
  Pencil,
  Trash2,
  ShieldCheck,
  UserPlus,
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
  coachTags?: string[];
  playerTags?: string[];
  notes?: string;
};

type Coach = {
  id: string;
  name: string;
  teams: string[];
  email?: string;
};

type Announcement = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  audience: "All" | "Parents" | "Coaches" | "Players" | "Team";
  teamTag?: string;
};

type AdminStats = {
  players: number;
  coaches: number;
  teams: number;
  events: number;
};

// API adapter functions
const API = {
  admin: {
    stats: "/api/admin/stats",
    events: "/api/events",
    eventById: (id: string) => `/api/events/${id}`,
    coaches: "/api/coaches",
    coachById: (id: string) => `/api/coaches/${id}`,
    announcements: "/api/announcements",
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

// ==============================
// Admin Dashboard
// ==============================
export default function AdminDashboard() {
  const qc = useQueryClient();
  const statsQ = useQuery<AdminStats>({ queryKey: ["admin","stats"], queryFn: () => jsonFetch(API.admin.stats) });
  const eventsQ = useQuery<UypEvent[]>({ queryKey: ["admin","events"], queryFn: () => jsonFetch(API.admin.events) });
  const coachesQ = useQuery<Coach[]>({ queryKey: ["admin","coaches"], queryFn: () => jsonFetch(API.admin.coaches) });
  const announcementsQ = useQuery<Announcement[]>({ queryKey: ["admin","announcements"], queryFn: () => jsonFetch(API.admin.announcements) });

  // Event form state
  const [evtTitle, setEvtTitle] = useState("");
  const [evtType, setEvtType] = useState<UypEvent["eventType"]>("Practice");
  const [evtTeamTag, setEvtTeamTag] = useState("");
  const [evtCoachTag, setEvtCoachTag] = useState("");
  const [evtLocation, setEvtLocation] = useState("");
  const [evtStart, setEvtStart] = useState("");
  const [evtEnd, setEvtEnd] = useState("");

  const createEventMut = useMutation({
    mutationFn: async () => jsonFetch(API.admin.events, {
      method: "POST",
      body: JSON.stringify({ title: evtTitle, eventType: evtType, teamTags: evtTeamTag? [evtTeamTag]:[], coachTags: evtCoachTag? [evtCoachTag]:[], location: evtLocation, startTime: evtStart, endTime: evtEnd })
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin","events"] });
      setEvtTitle(""); setEvtType("Practice"); setEvtTeamTag(""); setEvtCoachTag(""); setEvtLocation(""); setEvtStart(""); setEvtEnd("");
    }
  });

  const deleteEventMut = useMutation({
    mutationFn: async (id: string) => jsonFetch(API.admin.eventById(id), { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin","events"] })
  });

  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");
  const [annAudience, setAnnAudience] = useState<Announcement["audience"]>("All");
  const [annTeam, setAnnTeam] = useState("");

  const createAnnMut = useMutation({
    mutationFn: async () => jsonFetch(API.admin.announcements, {
      method: "POST",
      body: JSON.stringify({ title: annTitle, content: annBody, audience: annAudience, teamTag: annAudience === "Team" ? annTeam : undefined })
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin","announcements"] });
      setAnnTitle(""); setAnnBody(""); setAnnAudience("All"); setAnnTeam("");
    }
  });

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <GradientHeader title="Admin Dashboard" subtitle="Full control over events, coaches, and announcements." />

      {/* Top Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <motion.div variants={cardVariants} initial="hidden" animate="show">
          <div className="flex items-center justify-between rounded-2xl bg-gradient-to-br from-indigo-600/20 via-sky-600/20 to-teal-500/20 p-4 ring-1 ring-white/10">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-300">Players</p>
              <p className="text-2xl font-bold text-white">{statsQ.data?.players ?? "–"}</p>
            </div>
            <Users className="h-6 w-6 text-slate-200" />
          </div>
        </motion.div>
        <motion.div variants={cardVariants} initial="hidden" animate="show">
          <div className="flex items-center justify-between rounded-2xl bg-gradient-to-br from-indigo-600/20 via-sky-600/20 to-teal-500/20 p-4 ring-1 ring-white/10">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-300">Coaches</p>
              <p className="text-2xl font-bold text-white">{statsQ.data?.coaches ?? "–"}</p>
            </div>
            <ShieldCheck className="h-6 w-6 text-slate-200" />
          </div>
        </motion.div>
        <motion.div variants={cardVariants} initial="hidden" animate="show">
          <div className="flex items-center justify-between rounded-2xl bg-gradient-to-br from-indigo-600/20 via-sky-600/20 to-teal-500/20 p-4 ring-1 ring-white/10">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-300">Teams</p>
              <p className="text-2xl font-bold text-white">{statsQ.data?.teams ?? "–"}</p>
            </div>
            <Users className="h-6 w-6 text-slate-200" />
          </div>
        </motion.div>
        <motion.div variants={cardVariants} initial="hidden" animate="show">
          <div className="flex items-center justify-between rounded-2xl bg-gradient-to-br from-indigo-600/20 via-sky-600/20 to-teal-500/20 p-4 ring-1 ring-white/10">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-300">Events</p>
              <p className="text-2xl font-bold text-white">{statsQ.data?.events ?? "–"}</p>
            </div>
            <CalendarIcon className="h-6 w-6 text-slate-200" />
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Event Manager */}
        <motion.div variants={cardVariants} initial="hidden" animate="show" className="xl:col-span-2">
          <Card className="border-white/10 bg-slate-900/60 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <CalendarIcon className="h-5 w-5" /> Event Manager
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Create */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
                <Input placeholder="Title" value={evtTitle} onChange={(e)=>setEvtTitle(e.target.value)} className="md:col-span-2 border-white/10 bg-slate-900 text-slate-100" />
                <Select value={evtType} onValueChange={(v)=> setEvtType(v as any)}>
                  <SelectTrigger className="border-white/10 bg-slate-900 text-slate-100">
                    <SelectValue placeholder="Event Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 text-slate-100">
                    <SelectItem value="Practice">Practice</SelectItem>
                    <SelectItem value="Skills">Skills</SelectItem>
                    <SelectItem value="Game">Game</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Team tag (optional)" value={evtTeamTag} onChange={(e)=>setEvtTeamTag(e.target.value)} className="border-white/10 bg-slate-900 text-slate-100" />
                <Input placeholder="Coach tag (optional)" value={evtCoachTag} onChange={(e)=>setEvtCoachTag(e.target.value)} className="border-white/10 bg-slate-900 text-slate-100" />
                <Input placeholder="Location" value={evtLocation} onChange={(e)=>setEvtLocation(e.target.value)} className="md:col-span-2 border-white/10 bg-slate-900 text-slate-100" />
                <Input type="datetime-local" value={evtStart} onChange={(e)=>setEvtStart(e.target.value)} className="border-white/10 bg-slate-900 text-slate-100" />
                <Input type="datetime-local" value={evtEnd} onChange={(e)=>setEvtEnd(e.target.value)} className="border-white/10 bg-slate-900 text-slate-100" />
                <Button className="md:col-span-2 bg-sky-600 hover:bg-sky-500" onClick={()=> createEventMut.mutate()}>
                  <Plus className="mr-1 h-4 w-4" /> Create Event
                </Button>
              </div>

              {/* List */}
              <div className="rounded-xl bg-slate-800/60 p-3 ring-1 ring-white/10">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-slate-300">Title</TableHead>
                      <TableHead className="text-slate-300">When</TableHead>
                      <TableHead className="text-slate-300">Tags</TableHead>
                      <TableHead className="text-right text-slate-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(eventsQ.data || []).slice().sort((a,b)=> +new Date(b.startTime) - +new Date(a.startTime)).map((evt)=> (
                      <TableRow key={evt.id} className="hover:bg-slate-800/40">
                        <TableCell className="text-slate-200">{evt.title}</TableCell>
                        <TableCell className="text-slate-300">{formatDateRange(evt.startTime, evt.endTime)}</TableCell>
                        <TableCell className="text-slate-300">
                          <div className="flex flex-wrap gap-1">
                            {(evt.teamTags||[]).map(t=> <Badge key={t} className="bg-indigo-600/20 text-indigo-100">{t}</Badge>)}
                            {(evt.coachTags||[]).map(t=> <Badge key={t} className="bg-sky-600/20 text-sky-100">{t}</Badge>)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-300 hover:text-red-400" onClick={()=> deleteEventMut.mutate(evt.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Coaches Manager & Announcements */}
        <motion.div variants={cardVariants} initial="hidden" animate="show" className="space-y-6">
          {/* Coaches */}
          <Card className="border-white/10 bg-slate-900/60 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <ShieldCheck className="h-5 w-5" /> Coach Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl bg-slate-800/60 p-3 ring-1 ring-white/10">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-slate-300">Coach</TableHead>
                      <TableHead className="text-slate-300">Teams</TableHead>
                      <TableHead className="text-right text-slate-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(coachesQ.data || []).map((c)=> (
                      <TableRow key={c.id} className="hover:bg-slate-800/40">
                        <TableCell className="text-slate-200">{c.name}</TableCell>
                        <TableCell className="text-slate-300">{c.teams.join(", ")}</TableCell>
                        <TableCell className="text-right">
                          <Button size="icon" variant="ghost" className="text-slate-300 hover:text-white">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-red-300 hover:text-red-400">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Announcements */}
          <Card className="border-white/10 bg-slate-900/60 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Megaphone className="h-5 w-5" /> Announcements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Input placeholder="Title" value={annTitle} onChange={(e)=>setAnnTitle(e.target.value)} className="border-white/10 bg-slate-900 text-slate-100" />
                <Textarea placeholder="Message…" value={annBody} onChange={(e)=>setAnnBody(e.target.value)} className="border-white/10 bg-slate-900" />
                <div className="flex items-center gap-2">
                  <Select value={annAudience} onValueChange={(v)=> setAnnAudience(v as any)}>
                    <SelectTrigger className="w-[160px] border-white/10 bg-slate-900 text-slate-100">
                      <SelectValue placeholder="Audience" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 text-slate-100">
                      <SelectItem value="All">All</SelectItem>
                      <SelectItem value="Parents">Parents</SelectItem>
                      <SelectItem value="Coaches">Coaches</SelectItem>
                      <SelectItem value="Players">Players</SelectItem>
                      <SelectItem value="Team">Team</SelectItem>
                    </SelectContent>
                  </Select>
                  {annAudience === "Team" ? (
                    <Input placeholder="Team tag" value={annTeam} onChange={(e)=> setAnnTeam(e.target.value)} className="border-white/10 bg-slate-900 text-slate-100" />
                  ) : null}
                  <Button className="ml-auto bg-sky-600 hover:bg-sky-500" onClick={()=> createAnnMut.mutate()}>
                    <Plus className="mr-1 h-4 w-4" /> Publish
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {(announcementsQ.data || []).slice().sort((a,b)=> +new Date(b.createdAt) - +new Date(a.createdAt)).map((a)=> (
                  <div key={a.id} className="rounded-xl bg-slate-800/60 p-3 ring-1 ring-white/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">{a.title}</p>
                        <p className="text-xs text-slate-400">{new Date(a.createdAt).toLocaleString()} • {a.audience}{a.teamTag?` (${a.teamTag})`:''}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white"><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-red-300 hover:text-red-400"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">{a.content}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Helpful Admin Tools */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <motion.div variants={cardVariants} initial="hidden" animate="show">
          <Card className="border-white/10 bg-slate-900/60 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white"><UserPlus className="h-5 w-5" /> Import Roster (CSV)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-300">Drag a CSV into your dedicated Import screen (feature hook-up pending). Supports player name, number, team, email of parents, etc.</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={cardVariants} initial="hidden" animate="show">
          <Card className="border-white/10 bg-slate-900/60 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white"><Award className="h-5 w-5" /> Bulk Badge Grant</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-300">Select a team and grant a Starter Coach Badge to multiple players at once (hook to API when ready).</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={cardVariants} initial="hidden" animate="show">
          <Card className="border-white/10 bg-slate-900/60 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white"><Settings className="h-5 w-5" /> Role Controls</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-300">Promote/demote coaches, link teams, reset passwords, toggle active/inactive (connect actions as endpoints are available).</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}