import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Search,
  Calendar as CalendarIcon,
  Users,
  Trophy,
  ShieldCheck,
  ArrowRight,
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
  skillRatings?: Record<string, number>;
};

type Coach = {
  id: string;
  name: string;
  teams: string[];
  email?: string;
};

// API adapter functions
const API = {
  coaches: {
    me: "/api/coaches/me",
    roster: "/api/coaches/me/roster",
    events: "/api/coaches/me/events",
    searchPlayers: (q: string) => `/api/players/search?q=${encodeURIComponent(q)}`,
    awardBadge: "/api/badges/award",
    skills: (playerId: string) => `/api/players/${playerId}/skills`,
    submitEvaluation: (playerId: string) => `/api/players/${playerId}/evaluations`,
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
      <div className="rounded bg-sky-600/20 px-2 py-1 text-xs text-sky-100">
        {evt.eventType || "Event"}
      </div>
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
// Coach Dashboard
// ==============================
export default function CoachDashboard() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [evalOpen, setEvalOpen] = useState(false);
  const [evalData, setEvalData] = useState<Record<string, number>>({});

  const coachQ = useQuery<Coach>({ queryKey: ["coach","me"], queryFn: ()=> jsonFetch(API.coaches.me) });
  const rosterQ = useQuery<Player[]>({ queryKey: ["coach","roster"], queryFn: ()=> jsonFetch(API.coaches.roster) });
  const eventsQ = useQuery<UypEvent[]>({ queryKey: ["coach","events"], queryFn: ()=> jsonFetch(API.coaches.events) });

  const searchQ = useQuery<Player[]>({
    queryKey: ["coach","search", search],
    queryFn: () => jsonFetch(API.coaches.searchPlayers(search)),
    enabled: search.trim().length > 1,
  });

  const awardMut = useMutation({
    mutationFn: async (payload: { playerId: string; badgeId: string; reason?: string }) =>
      jsonFetch(API.coaches.awardBadge, { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coach","roster"] });
    },
  });

  const skillsQ = useQuery<string[]>({
    queryKey: ["coach","skills", selectedPlayer?.id],
    queryFn: () => jsonFetch(API.coaches.skills(selectedPlayer!.id)),
    enabled: !!selectedPlayer,
  });

  const evalMut = useMutation({
    mutationFn: async (payload: { playerId: string; ratings: Record<string, number>; period: string; notes?: string }) =>
      jsonFetch(API.coaches.submitEvaluation(payload.playerId), { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => {
      setEvalOpen(false);
      setSelectedPlayer(null);
    },
  });

  const upcoming = useMemo(() => (eventsQ.data || []).slice().sort((a,b)=>+new Date(a.startTime)-+new Date(b.startTime)).slice(0,6), [eventsQ.data]);

  // Starter Coach Badges
  const STARTER_BADGES = [
    { id: "hustle-award", name: "Hustle" },
    { id: "teammate-award", name: "Leadership" },
    { id: "game-mvp", name: "Sportsmanship" },
    { id: "student-of-the-game", name: "Effort" },
  ];
  const [selectedBadge, setSelectedBadge] = useState<string>(STARTER_BADGES[0].id);
  const [awardReason, setAwardReason] = useState("");

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <GradientHeader title="Coach Dashboard" subtitle="Award badges, manage roster, and track your calendar." />

      {/* Top Stats */}
      <div className="mb-6 flex flex-wrap gap-2">
        <StatPill label="Teams" value={coachQ.data?.teams.length ?? 0} icon={ShieldCheck} />
        <StatPill label="Roster" value={rosterQ.data?.length ?? 0} icon={Users} />
        <StatPill label="Upcoming" value={upcoming.length} icon={CalendarIcon} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Award Starter Coach Badges */}
        <motion.div variants={cardVariants} initial="hidden" animate="show" className="lg:col-span-1">
          <Card className="border-white/10 bg-slate-900/60 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Trophy className="h-5 w-5" /> Award Starter Coach Badges
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 rounded-xl bg-slate-800/60 p-2 ring-1 ring-white/10">
                <Search className="ml-2 h-4 w-4 text-slate-400" />
                <Input placeholder="Search players…" value={search} onChange={(e)=>setSearch(e.target.value)} className="border-0 bg-transparent text-white placeholder:text-slate-500 focus-visible:ring-0" />
              </div>

              {search.trim().length > 1 ? (
                <div className="space-y-2">
                  {searchQ.isLoading ? <p className="text-sm text-slate-400">Searching…</p> : null}
                  {(searchQ.data || []).map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-xl bg-slate-800/60 p-3 ring-1 ring-white/10">
                      <div>
                        <p className="text-sm font-medium text-white">{p.name}{typeof p.number==='number' ? ` #${p.number}`:''}</p>
                        <p className="text-xs text-slate-400">{p.team || "Unassigned"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select value={selectedBadge} onValueChange={setSelectedBadge}>
                          <SelectTrigger className="w-[150px] border-white/10 bg-slate-900 text-slate-100">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 text-slate-100">
                            {STARTER_BADGES.map((b)=> <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button size="sm" className="bg-sky-600 text-white hover:bg-sky-500" onClick={()=> awardMut.mutate({ playerId: p.id, badgeId: selectedBadge, reason: awardReason || undefined })}>
                          Give <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="rounded-xl bg-slate-800/60 p-3 ring-1 ring-white/10">
                    <Label className="text-xs text-slate-300">Reason (optional)</Label>
                    <Input value={awardReason} onChange={(e)=>setAwardReason(e.target.value)} placeholder="Add a note (visible to player & parent)" className="mt-1 border-white/10 bg-slate-900 text-sm text-slate-100 placeholder:text-slate-500" />
                  </div>
                </div>
              ) : (
                <EmptyState icon={Trophy} title="Search a player to award a badge" />
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Upcoming Events */}
        <motion.div variants={cardVariants} initial="hidden" animate="show" className="lg:col-span-1">
          <Card className="border-white/10 bg-slate-900/60 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <CalendarIcon className="h-5 w-5" /> Your Tagged Events
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcoming.length === 0 ? (
                <EmptyState icon={CalendarIcon} title="No upcoming events" hint="Events tagged with you or your team will appear here." />
              ) : (
                upcoming.map((evt)=> <EventChip key={evt.id} evt={evt} />)
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Roster & Quarterly Evaluations */}
        <motion.div variants={cardVariants} initial="hidden" animate="show" className="lg:col-span-1">
          <Card className="border-white/10 bg-slate-900/60 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Users className="h-5 w-5" /> Team Roster
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(rosterQ.data || []).length === 0 ? (
                <EmptyState icon={Users} title="No players on roster" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-slate-300">Player</TableHead>
                      <TableHead className="text-slate-300">Team</TableHead>
                      <TableHead className="text-slate-300">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rosterQ.data!.map((p)=> (
                      <TableRow key={p.id} className="hover:bg-slate-800/50">
                        <TableCell className="text-slate-200">{p.name}{typeof p.number==='number'?` #${p.number}`:''}</TableCell>
                        <TableCell className="text-slate-300">{p.team || "–"}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="secondary" className="bg-indigo-600/20 text-indigo-100 hover:bg-indigo-600/30" onClick={()=> { setSelectedPlayer(p); setEvalOpen(true); }}>
                            Quarterly Eval
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Evaluation Dialog */}
      <Dialog open={evalOpen} onOpenChange={setEvalOpen}>
        <DialogContent className="max-w-xl border-white/10 bg-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle>Quarterly Evaluation {selectedPlayer ? `— ${selectedPlayer.name}` : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!selectedPlayer ? null : (
              <>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {(skillsQ.data || ["Shooting","Passing","Defense","Rebounding","IQ","Hustle"]).map((skill)=> (
                    <div key={skill} className="rounded-xl bg-slate-800/60 p-3 ring-1 ring-white/10">
                      <Label className="text-xs text-slate-300">{skill}</Label>
                      <input
                        type="range"
                        min={1}
                        max={10}
                        value={evalData[skill] ?? 5}
                        onChange={(e)=> setEvalData((d)=> ({ ...d, [skill]: Number(e.target.value) }))}
                        className="mt-2 w-full"
                      />
                      <div className="mt-1 text-right text-xs text-slate-400">{evalData[skill] ?? 5}/10</div>
                    </div>
                  ))}
                </div>
                <div>
                  <Label className="text-xs text-slate-300">Notes (optional)</Label>
                  <Textarea placeholder="Observations, goals for next quarter…" className="mt-1 border-white/10 bg-slate-900" />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={()=> setEvalOpen(false)}>Cancel</Button>
            <Button className="bg-sky-600 hover:bg-sky-500" onClick={()=> selectedPlayer && evalMut.mutate({ playerId: selectedPlayer.id, ratings: evalData, period: "Q"+(((new Date().getMonth())/3|0)+1) })}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}