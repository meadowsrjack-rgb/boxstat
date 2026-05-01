import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus, Trophy, Sparkles, ArrowLeft, ArrowRight, Send, Calendar,
  MapPin, Users, Target, ChevronRight, Play, Activity, Megaphone,
  Settings, ExternalLink, Check, X, Inbox, Globe, Edit, Trash2,
} from "lucide-react";

type Tournament = {
  id: number;
  name: string;
  sport: string;
  format: string;
  ageGroup?: string;
  startDate: string;
  endDate: string;
  venue?: string;
  courts?: string[];
  status: string;
  isPublic?: boolean;
  description?: string;
  bracketSize?: number;
  organizationId: string;
};

type Team = {
  id: number | string;
  name: string;
};

type Match = {
  id: number;
  tournamentId: number;
  eventId?: number | null;
  round: number;
  matchNumber: number;
  positionInRound: number;
  team1Id?: number | null;
  team2Id?: number | null;
  team1Score?: number | null;
  team2Score?: number | null;
  winnerTeamId?: number | null;
  nextMatchId?: number | null;
  nextMatchSlot?: number | null;
  court?: string;
  status: string;
};

type TTeam = {
  id: number;
  tournamentId: number;
  teamId?: number | null;
  externalName?: string;
  externalContact?: string;
  externalEmail?: string;
  seed?: number;
  wins?: number;
  losses?: number;
  ties?: number;
  pointsFor?: number;
  pointsAgainst?: number;
  status?: string;
};

interface Props {
  organization: any;
  teams: Team[];
  facilities: any[];
  currentUser: any;
}

const SPORT_OPTIONS = [
  { value: "basketball", label: "Basketball", icon: "🏀" },
  { value: "football", label: "Football", icon: "🏈" },
  { value: "soccer", label: "Soccer", icon: "⚽" },
  { value: "baseball", label: "Baseball", icon: "⚾" },
  { value: "volleyball", label: "Volleyball", icon: "🏐" },
  { value: "other", label: "Other", icon: "🏆" },
];

const FORMAT_OPTIONS = [
  { value: "single_elim", label: "Single Elimination", desc: "Lose once and you're out. Fast and dramatic." },
  { value: "double_elim", label: "Double Elimination", desc: "Loser bracket gives a second chance." },
  { value: "round_robin", label: "Round Robin", desc: "Everyone plays everyone. Best for small fields." },
  { value: "groups_knockouts", label: "Groups + Knockouts", desc: "Group stage then bracket. World Cup style." },
];

export default function TournamentsTab({ organization, teams, facilities, currentUser }: Props) {
  const [view, setView] = useState<"hub" | "wizard" | "detail">("hub");
  const [activeTournamentId, setActiveTournamentId] = useState<number | null>(null);

  const { data: tournaments = [], isLoading } = useQuery<Tournament[]>({
    queryKey: ["/api/tournaments"],
  });

  const { data: joinRequests = [] } = useQuery<any[]>({
    queryKey: ["/api/tournament-join-requests"],
  });

  if (view === "wizard") {
    return <TournamentWizard
      organization={organization}
      teams={teams}
      facilities={facilities}
      editTournamentId={activeTournamentId ?? undefined}
      onCancel={() => setView(activeTournamentId ? "detail" : "hub")}
      onCreated={(id: number) => { setActiveTournamentId(id); setView("detail"); }}
    />;
  }

  if (view === "detail" && activeTournamentId) {
    return <TournamentDetail
      tournamentId={activeTournamentId}
      teams={teams}
      onBack={() => { setActiveTournamentId(null); setView("hub"); }}
      onEdit={() => setView("wizard")}
    />;
  }

  return <TournamentHub
    tournaments={tournaments}
    joinRequests={joinRequests}
    teams={teams}
    isLoading={isLoading}
    onNew={() => { setActiveTournamentId(null); setView("wizard"); }}
    onOpen={(id) => { setActiveTournamentId(id); setView("detail"); }}
  />;
}

// ==================== HUB ====================
function TournamentHub({
  tournaments, joinRequests, teams, isLoading, onNew, onOpen,
}: { tournaments: Tournament[]; joinRequests: any[]; teams: Team[]; isLoading: boolean; onNew: () => void; onOpen: (id: number) => void }) {
  const [, navigate] = useLocation();
  const [filter, setFilter] = useState<"all" | "upcoming" | "live" | "completed" | "draft">("all");
  const [showRequests, setShowRequests] = useState(false);
  const [showListings, setShowListings] = useState(false);

  const filtered = tournaments.filter(t => filter === "all" ? true : t.status === filter);
  const pendingRequests = joinRequests.filter(r => r.status === "pending");

  return (
    <div className="bg-zinc-950 -mx-4 lg:-mx-8 -my-4 lg:-my-8 px-4 lg:px-8 py-6 lg:py-8 min-h-[calc(100vh-200px)]" data-testid="tournament-hub">
      {/* Hero */}
      <div className="rounded-3xl overflow-hidden border border-red-600/40 mb-6 relative" style={{ background: "linear-gradient(135deg,rgba(226,18,36,0.18),rgba(226,18,36,0.04) 50%,rgba(0,0,0,0.6))" }}>
        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-0">
          <div className="p-8 flex flex-col gap-4 justify-between relative z-10">
            <div>
              <p className="text-xs font-bold tracking-widest text-red-400 uppercase mb-2">Tournament Hub</p>
              <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight" style={{ letterSpacing: "-0.02em" }}>
                Build the next great tournament.
              </h1>
              <p className="text-zinc-400 mt-3 max-w-xl">
                AI-assisted creation, drag-and-drop brackets, schedule conflict detection, and live broadcast — all from one cinematic console.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 mt-4">
              <Button onClick={onNew} className="bg-red-600 hover:bg-red-700 text-white" data-testid="button-new-tournament">
                <Sparkles className="w-4 h-4 mr-2" /> New Tournament
              </Button>
              <Button variant="outline" onClick={() => setShowRequests(true)} className="bg-white/5 border-white/20 text-white hover:bg-white/10">
                <Inbox className="w-4 h-4 mr-2" /> Join Requests
                {pendingRequests.length > 0 && <Badge className="ml-2 bg-red-600">{pendingRequests.length}</Badge>}
              </Button>
              <Button variant="outline" onClick={() => setShowListings(true)} className="bg-white/5 border-white/20 text-white hover:bg-white/10">
                <Globe className="w-4 h-4 mr-2" /> External Listings
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/marketplace")}
                className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                data-testid="button-open-marketplace"
              >
                <ExternalLink className="w-4 h-4 mr-2" /> Open Marketplace
              </Button>
            </div>
          </div>
          <div className="p-8 bg-black/40 backdrop-blur border-l border-white/5 relative z-10">
            <p className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-3">At a Glance</p>
            <div className="grid grid-cols-2 gap-4">
              <Stat label="Total" value={tournaments.length} />
              <Stat label="Live" value={tournaments.filter(t => t.status === "live").length} accent />
              <Stat label="Upcoming" value={tournaments.filter(t => t.status === "upcoming").length} />
              <Stat label="Drafts" value={tournaments.filter(t => t.status === "draft").length} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-6">
        {(["all", "draft", "upcoming", "live", "completed"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            data-testid={`filter-${f}`}
            className={`px-3.5 py-2 rounded-full text-[11px] font-bold tracking-widest uppercase transition-all ${
              filter === f
                ? "bg-red-600/20 text-red-400 border border-red-600/40"
                : "bg-white/[0.02] text-white/60 border border-white/10 hover:border-white/20"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          onClick={onNew}
          data-testid="button-new-tournament-card"
          className="rounded-2xl p-6 flex flex-col items-center justify-center text-center border border-dashed border-red-600/40 min-h-[228px] transition-all hover:border-red-600 hover:bg-red-600/5"
          style={{ background: "radial-gradient(circle at center,rgba(226,18,36,0.08),transparent 70%)" }}
        >
          <Plus className="w-9 h-9 text-red-500 mb-3" />
          <p className="text-white font-bold text-lg">Create new</p>
          <p className="text-zinc-500 text-xs mt-1">AI guided in 4 steps</p>
        </button>

        {isLoading ? (
          [0, 1, 2].map(i => (
            <div key={i} className="rounded-2xl border border-white/10 p-5 space-y-3" style={{ background: "linear-gradient(145deg,rgba(255,255,255,0.03),rgba(255,255,255,0.005))" }}>
              <Skeleton className="h-6 w-3/4 bg-white/5" />
              <Skeleton className="h-4 w-1/2 bg-white/5" />
              <Skeleton className="h-16 w-full bg-white/5" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-white/10 bg-zinc-900/40 p-10 text-center" data-testid="hub-empty-state">
            <Trophy className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-white font-bold mb-1">No tournaments yet</p>
            <p className="text-zinc-500 text-sm">Click <span className="text-white">Create new</span> to launch one with the AI builder.</p>
          </div>
        ) : (
          filtered.map(t => (
            <TournamentCard key={t.id} tournament={t} onOpen={() => onOpen(t.id)} />
          ))
        )}
      </div>

      {showRequests && (
        <JoinRequestsDrawer
          requests={joinRequests}
          tournaments={tournaments}
          teams={teams}
          onClose={() => setShowRequests(false)}
        />
      )}
      {showListings && (
        <ExternalListingsDrawer onClose={() => setShowListings(false)} />
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div>
      <p className={`text-3xl font-bold ${accent ? "text-red-500" : "text-white"}`} style={{ letterSpacing: "-0.02em" }}>{value}</p>
      <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase mt-1">{label}</p>
    </div>
  );
}

function TournamentCard({ tournament, onOpen }: { tournament: Tournament; onOpen: () => void }) {
  const sport = SPORT_OPTIONS.find(s => s.value === tournament.sport);
  const start = new Date(tournament.startDate);
  return (
    <button
      onClick={onOpen}
      data-testid={`tournament-card-${tournament.id}`}
      className="text-left rounded-2xl p-5 border border-white/10 transition-all hover:-translate-y-1 hover:border-red-600/40"
      style={{ background: "linear-gradient(145deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))" }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-2xl">{sport?.icon || "🏆"}</div>
          <div>
            <h3 className="text-white font-bold text-lg leading-tight" style={{ letterSpacing: "-0.02em" }}>{tournament.name}</h3>
            <p className="text-zinc-500 text-[11px] uppercase tracking-wider mt-1">{sport?.label} · {tournament.ageGroup || "All ages"}</p>
          </div>
        </div>
        <StatusPill status={tournament.status} />
      </div>
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/5 mt-3">
        <div>
          <p className="text-white text-sm font-bold">{start.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</p>
          <p className="text-[10px] tracking-widest text-zinc-500 uppercase mt-0.5">Starts</p>
        </div>
        <div>
          <p className="text-white text-sm font-bold capitalize">{(tournament.format || "—").replace("_", " ")}</p>
          <p className="text-[10px] tracking-widest text-zinc-500 uppercase mt-0.5">Format</p>
        </div>
        <div>
          <p className="text-white text-sm font-bold">{tournament.venue || "—"}</p>
          <p className="text-[10px] tracking-widest text-zinc-500 uppercase mt-0.5">Venue</p>
        </div>
      </div>
    </button>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-zinc-700 text-zinc-300",
    upcoming: "bg-blue-600/20 text-blue-300 border-blue-600/40",
    live: "bg-green-600/20 text-green-300 border-green-600/40",
    completed: "bg-purple-600/20 text-purple-300 border-purple-600/40",
  };
  return (
    <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-widest uppercase border ${map[status] || map.draft}`}>
      {status}
    </span>
  );
}

// ==================== WIZARD ====================
function TournamentWizard({ organization, teams, facilities, editTournamentId, onCancel, onCreated }: any) {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const steps = ["Format", "Teams", "Schedule", "Review"];
  const isEdit = !!editTournamentId;
  const [state, setState] = useState<any>({
    name: "",
    sport: "basketball",
    format: "single_elim",
    ageGroup: "",
    teams: [] as Array<{ id?: number; name: string; isExternal?: boolean }>,
    startDate: "",
    endDate: "",
    venue: "",
    courts: [] as string[],
    description: "",
    isPublic: true,
  });

  // Edit-mode prefill: load the tournament + its teams into the same builder
  // so an admin can iterate on the same wizard surface they used to create it.
  const { data: existingTournament } = useQuery<any>({
    queryKey: ["/api/tournaments", editTournamentId],
    enabled: !!editTournamentId,
  });
  const { data: existingTeams } = useQuery<any[]>({
    queryKey: ["/api/tournaments", editTournamentId, "teams"],
    enabled: !!editTournamentId,
  });
  useEffect(() => {
    if (!existingTournament) return;
    setState((s: any) => ({
      ...s,
      name: existingTournament.name || "",
      sport: existingTournament.sport || "basketball",
      format: existingTournament.format || "single_elim",
      ageGroup: existingTournament.ageGroup || "",
      startDate: existingTournament.startDate?.slice?.(0, 10) || "",
      endDate: existingTournament.endDate?.slice?.(0, 10) || "",
      venue: existingTournament.venue || "",
      courts: Array.isArray(existingTournament.courts) ? existingTournament.courts : [],
      description: existingTournament.description || "",
      isPublic: existingTournament.isPublic !== false,
      teams: (existingTeams || []).map((tt: any) => ({
        id: tt.teamId || undefined,
        name: tt.externalName || tt.name || `Team ${tt.id}`,
        isExternal: !tt.teamId,
      })),
    }));
  }, [existingTournament, existingTeams]);
  const [aiMessages, setAiMessages] = useState<Array<{ from: "ai" | "user"; text: string }>>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState<any | null>(null);

  const aiMutation = useMutation({
    mutationFn: async (action: string) => {
      return await apiRequest("/api/tournaments/ai-builder", { method: "POST", data: { state, action, message: aiInput } });
    },
    onSuccess: (data: any) => {
      if (data.chatReply) setAiMessages(m => [...m, { from: "ai", text: data.chatReply }]);
      if (data.tip) setAiMessages(m => m.length === 0 ? [{ from: "ai", text: data.tip }] : m);
      setAiSuggestion(data);
    },
  });

  // Deterministic Apply actions: each button maps the AI suggestion to a
  // specific wizard-state mutation so the assistant can drive the form, not
  // just narrate it.
  const applyFormat = () => {
    if (!aiSuggestion?.recommendedFormat) return;
    setState((s: any) => ({ ...s, format: aiSuggestion.recommendedFormat }));
    setAiMessages(m => [...m, { from: "ai", text: `Applied: format → ${String(aiSuggestion.recommendedFormat).replace('_', ' ')}.` }]);
  };
  const applySeeding = () => {
    if (!Array.isArray(aiSuggestion?.seedingOrder) || aiSuggestion.seedingOrder.length === 0) return;
    setState((s: any) => ({
      ...s,
      teams: aiSuggestion.seedingOrder.map((t: any, i: number) => ({
        id: t.id,
        name: t.name || t.externalName || `Team ${i + 1}`,
        isExternal: !t.id,
        externalContactEmail: t.externalContactEmail,
      })),
    }));
    setAiMessages(m => [...m, { from: "ai", text: `Applied: seeded ${aiSuggestion.seedingOrder.length} teams in suggested order.` }]);
  };
  const applyCourts = () => {
    const n = aiSuggestion?.schedule?.courtsCount;
    if (!n || n < 1) return;
    const courts = Array.from({ length: n }, (_, i) => `Court ${i + 1}`);
    setState((s: any) => ({ ...s, courts }));
    setAiMessages(m => [...m, { from: "ai", text: `Applied: provisioned ${n} court(s).` }]);
  };

  const createMutation = useMutation({
    mutationFn: async (opts: { publish?: boolean } = {}) => {
      let tournament: any;
      if (isEdit) {
        tournament = await apiRequest(`/api/tournaments/${editTournamentId}`, {
          method: "PATCH",
          data: {
            name: state.name,
            sport: state.sport,
            format: state.format,
            ageGroup: state.ageGroup || null,
            startDate: state.startDate,
            endDate: state.endDate,
            venue: state.venue,
            courts: state.courts,
            description: state.description,
            isPublic: state.isPublic,
          },
        });
        // Reconcile teams: best-effort — add any new ones the user added.
        const existing = (existingTeams || []) as any[];
        for (let i = 0; i < state.teams.length; i++) {
          const t = state.teams[i];
          const already = existing.find(et => (t.id && et.teamId === t.id) || (!t.id && et.externalName === t.name));
          if (already) continue;
          await apiRequest(`/api/tournaments/${tournament.id}/teams`, {
            method: "POST",
            data: t.isExternal
              ? { externalName: t.name, externalEmail: t.externalContactEmail || null, seed: i + 1 }
              : { teamId: t.id, externalName: t.name, seed: i + 1 },
          });
        }
      } else {
        tournament = await apiRequest("/api/tournaments", {
          method: "POST",
          data: {
            name: state.name,
            sport: state.sport,
            format: state.format,
            ageGroup: state.ageGroup || null,
            startDate: state.startDate,
            endDate: state.endDate,
            venue: state.venue,
            courts: state.courts,
            description: state.description,
            isPublic: state.isPublic,
            status: "draft",
          },
        });
        for (let i = 0; i < state.teams.length; i++) {
          const t = state.teams[i];
          await apiRequest(`/api/tournaments/${tournament.id}/teams`, {
            method: "POST",
            data: t.isExternal
              ? { externalName: t.name, externalEmail: t.externalContactEmail || null, seed: i + 1 }
              : { teamId: t.id, externalName: t.name, seed: i + 1 },
          });
        }
      }
      // Optional: publish immediately. The server-side publish endpoint
      // creates an event per match and fans out pending RSVPs to both
      // rosters in a single transaction.
      if (opts.publish) {
        await apiRequest(`/api/tournaments/${tournament.id}/publish`, { method: "POST" });
      }
      return { tournament, published: !!opts.publish };
    },
    onSuccess: ({ tournament, published }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", tournament.id] });
      toast({
        title: isEdit ? "Tournament updated" : published ? "Tournament published" : "Tournament created",
        description: published
          ? `${tournament.name} is live — match events and invites have been sent.`
          : isEdit
            ? `${tournament.name} has been saved.`
            : `${tournament.name} is saved as a draft.`,
      });
      onCreated(tournament.id);
    },
    onError: (e: any) => toast({ title: isEdit ? "Could not update" : "Could not create", description: e.message, variant: "destructive" }),
  });

  const sendChat = () => {
    if (!aiInput.trim()) return;
    setAiMessages(m => [...m, { from: "user", text: aiInput }]);
    aiMutation.mutate("chat");
    setAiInput("");
  };

  const requestSuggestion = () => aiMutation.mutate("suggest");

  const canNext = useMemo(() => {
    if (step === 0) return !!state.name && !!state.sport && !!state.format;
    if (step === 1) return state.teams.length >= 2;
    if (step === 2) return !!state.startDate && !!state.endDate && !!state.venue;
    return true;
  }, [step, state]);

  return (
    <div className="bg-black -mx-4 lg:-mx-8 -my-4 lg:-my-8 min-h-[calc(100vh-150px)] grid grid-cols-1 lg:grid-cols-[260px_1fr_320px]" data-testid="tournament-wizard">
      {/* Steps sidebar */}
      <aside className="p-6 border-r border-white/5 bg-zinc-950">
        <div className="flex items-center gap-2 mb-6">
          <Button size="sm" variant="ghost" onClick={onCancel} className="text-zinc-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-1" /> Cancel
          </Button>
        </div>
        <p className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-4">New Tournament</p>
        <div className="space-y-1">
          {steps.map((label, i) => (
            <button
              key={i}
              onClick={() => i < step && setStep(i)}
              data-testid={`wizard-step-${i}`}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left text-sm font-semibold ${
                i === step ? "bg-red-600/10 text-white" : i < step ? "text-zinc-300 hover:bg-white/5" : "text-zinc-600"
              }`}
            >
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                i === step ? "bg-red-600 text-white" : i < step ? "bg-green-600/20 text-green-400 border border-green-600/40" : "border border-white/15 text-zinc-500"
              }`}>
                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Main panel */}
      <main className="p-8 lg:p-12 overflow-y-auto">
        {step === 0 && <StepFormat state={state} setState={setState} />}
        {step === 1 && <StepTeams state={state} setState={setState} teams={teams} />}
        {step === 2 && <StepSchedule state={state} setState={setState} />}
        {step === 3 && <StepReview state={state} />}
        <div className="mt-10 flex justify-between border-t border-white/5 pt-6">
          <Button variant="ghost" disabled={step === 0} onClick={() => setStep(s => Math.max(0, s - 1))} className="text-zinc-400">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep(s => Math.min(3, s + 1))} disabled={!canNext} className="bg-red-600 hover:bg-red-700" data-testid="wizard-next">
              Next <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={() => createMutation.mutate({})} disabled={createMutation.isPending} variant="outline" className="bg-white/5 border-white/20 text-white hover:bg-white/10" data-testid="wizard-create">
                {createMutation.isPending ? "Saving…" : isEdit ? "Save Changes" : "Save as Draft"}
              </Button>
              {!isEdit && (
                <Button onClick={() => createMutation.mutate({ publish: true })} disabled={createMutation.isPending} className="bg-red-600 hover:bg-red-700" data-testid="wizard-create-publish">
                  {createMutation.isPending ? "Publishing…" : "Create & Publish"}
                </Button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* AI side panel */}
      <aside className="p-6 border-l border-red-600/20 overflow-y-auto" style={{ background: "linear-gradient(180deg,rgba(226,18,36,0.05),rgba(0,0,0,0.4))" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-[0_0_20px_rgba(226,18,36,0.5)]">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">AI Assistant</p>
            <p className="text-zinc-500 text-[11px]">Tournament copilot</p>
          </div>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4 mb-3">
          <p className="text-zinc-300 text-sm leading-relaxed">
            Hi — I'll help you build a great tournament. Tell me about your teams, dates, and goals, and I'll suggest the best format and schedule.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={requestSuggestion} className="bg-white/5 border-white/15 text-white hover:bg-white/10 mb-3" disabled={aiMutation.isPending} data-testid="ai-suggest">
          <Sparkles className="w-3.5 h-3.5 mr-1.5" /> {aiMutation.isPending ? "Thinking…" : "Suggest format"}
        </Button>
        {aiSuggestion && (
          <div className="rounded-xl bg-black/30 border border-red-600/20 p-3 mb-4 space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-red-400 font-bold">Apply suggestion</p>
            {aiSuggestion.recommendedFormat && (
              <button onClick={applyFormat} data-testid="ai-apply-format" className="w-full text-left text-xs text-white px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10">
                Use {String(aiSuggestion.recommendedFormat).replace('_', ' ')} format
              </button>
            )}
            {Array.isArray(aiSuggestion.seedingOrder) && aiSuggestion.seedingOrder.length > 0 && (
              <button onClick={applySeeding} data-testid="ai-apply-seeding" className="w-full text-left text-xs text-white px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10">
                Apply seeding ({aiSuggestion.seedingOrder.length} teams)
              </button>
            )}
            {aiSuggestion?.schedule?.courtsCount > 0 && (
              <button onClick={applyCourts} data-testid="ai-apply-courts" className="w-full text-left text-xs text-white px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10">
                Provision {aiSuggestion.schedule.courtsCount} court(s)
              </button>
            )}
            {Array.isArray(aiSuggestion.warnings) && aiSuggestion.warnings.length > 0 && (
              <div className="text-[11px] text-amber-300 mt-2 space-y-1">
                {aiSuggestion.warnings.map((w: string, i: number) => <p key={i}>• {w}</p>)}
              </div>
            )}
          </div>
        )}
        <div className="space-y-2 mb-3">
          {aiMessages.map((m, i) => (
            <div key={i} className={`p-3 rounded-xl text-sm ${
              m.from === "user" ? "bg-white/[0.06] text-white ml-auto max-w-[85%]" :
              "bg-red-600/[0.08] border border-red-600/20 text-zinc-200"
            }`}>
              {m.text}
            </div>
          ))}
        </div>
        <div className="flex gap-2 p-2 bg-white/5 border border-white/10 rounded-xl items-center">
          <input
            value={aiInput}
            onChange={e => setAiInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendChat()}
            placeholder="Ask the assistant…"
            className="bg-transparent border-0 outline-none text-white text-sm flex-1 px-2"
            data-testid="ai-input"
          />
          <button onClick={sendChat} className="w-8 h-8 rounded-lg bg-red-600 hover:bg-red-700 flex items-center justify-center text-white">
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>
    </div>
  );
}

function StepFormat({ state, setState }: any) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-bold tracking-widest text-red-400 uppercase mb-1">Step 1 of 4</p>
        <h2 className="text-3xl font-bold text-white" style={{ letterSpacing: "-0.02em" }}>Name & format</h2>
        <p className="text-zinc-400 mt-2">Pick a sport, name your event, then choose how teams will compete.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <Label className="text-zinc-400 text-xs uppercase tracking-wider mb-2 block">Tournament name</Label>
          <Input
            value={state.name}
            onChange={e => setState((s: any) => ({ ...s, name: e.target.value }))}
            placeholder="e.g. Spring Showdown 2026"
            className="bg-white/5 border-white/10 text-white"
            data-testid="input-name"
          />
        </div>
        <div>
          <Label className="text-zinc-400 text-xs uppercase tracking-wider mb-2 block">Age group (optional)</Label>
          <Input
            value={state.ageGroup}
            onChange={e => setState((s: any) => ({ ...s, ageGroup: e.target.value }))}
            placeholder="U14, 12U, Open..."
            className="bg-white/5 border-white/10 text-white"
          />
        </div>
      </div>

      <div>
        <Label className="text-zinc-400 text-xs uppercase tracking-wider mb-2 block">Sport</Label>
        <div className="flex gap-2 flex-wrap">
          {SPORT_OPTIONS.map(s => (
            <button
              key={s.value}
              onClick={() => setState((st: any) => ({ ...st, sport: s.value }))}
              data-testid={`sport-${s.value}`}
              className={`px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-semibold border ${
                state.sport === s.value ? "bg-red-600 text-white border-red-600" : "bg-white/5 text-zinc-300 border-white/10 hover:border-white/20"
              }`}
            >
              <span>{s.icon}</span> {s.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-zinc-400 text-xs uppercase tracking-wider mb-2 block">Format</Label>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {FORMAT_OPTIONS.map(f => (
            <button
              key={f.value}
              onClick={() => setState((s: any) => ({ ...s, format: f.value }))}
              data-testid={`format-${f.value}`}
              className={`text-left p-5 rounded-xl border transition-all ${
                state.format === f.value
                  ? "border-red-600 bg-gradient-to-br from-red-600/15 to-red-600/[0.02]"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20"
              }`}
            >
              <h4 className="text-white font-bold mb-1">{f.label}</h4>
              <p className="text-zinc-500 text-xs leading-relaxed">{f.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepTeams({ state, setState, teams }: any) {
  const [externalName, setExternalName] = useState("");
  const [externalEmail, setExternalEmail] = useState("");
  const ownIds = new Set(state.teams.filter((t: any) => !t.isExternal).map((t: any) => t.id));
  const addTeam = (team: { id?: number; name: string; isExternal?: boolean; externalContactEmail?: string }) => {
    setState((s: any) => ({ ...s, teams: [...s.teams, team] }));
  };
  const removeTeam = (idx: number) => {
    setState((s: any) => ({ ...s, teams: s.teams.filter((_: any, i: number) => i !== idx) }));
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-bold tracking-widest text-red-400 uppercase mb-1">Step 2 of 4</p>
        <h2 className="text-3xl font-bold text-white" style={{ letterSpacing: "-0.02em" }}>Add teams</h2>
        <p className="text-zinc-400 mt-2">Pull in your own teams or add external invites. Drag to reorder seeds in the bracket later.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">Available teams <span className="text-zinc-500 text-xs">({(teams || []).length})</span></h4>
          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {(teams || []).map((t: any) => {
              const added = ownIds.has(t.id);
              return (
                <div
                  key={t.id}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border ${added ? "bg-red-600/[0.08] border-red-600/30" : "bg-white/[0.03] border-white/5"}`}
                  data-testid={`available-team-${t.id}`}
                >
                  <div className="w-8 h-8 rounded-lg bg-zinc-700 flex items-center justify-center text-xs text-white font-bold">
                    {(t.name || "?").substring(0, 2).toUpperCase()}
                  </div>
                  <p className="text-sm text-white font-semibold flex-1">{t.name}</p>
                  <button
                    onClick={() => added ? removeTeam(state.teams.findIndex((x: any) => x.id === t.id)) : addTeam({ id: t.id, name: t.name })}
                    className={`w-7 h-7 rounded-md flex items-center justify-center ${added ? "bg-red-600 text-white" : "bg-white/5 text-zinc-300 hover:bg-white/10"}`}
                  >
                    {added ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  </button>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-white/5">
            <p className="text-xs text-zinc-500 mb-2">Or add an external team by name</p>
            <div className="space-y-2">
              <Input
                value={externalName}
                onChange={e => setExternalName(e.target.value)}
                placeholder="Team name"
                className="bg-white/5 border-white/10 text-white"
                data-testid="input-external-team-name"
              />
              <div className="flex gap-2">
                <Input
                  value={externalEmail}
                  onChange={e => setExternalEmail(e.target.value)}
                  placeholder="Contact email (we'll send an invite)"
                  className="bg-white/5 border-white/10 text-white"
                  data-testid="input-external-team-email"
                />
                <Button
                  disabled={!externalName.trim()}
                  onClick={() => {
                    addTeam({ name: externalName.trim(), isExternal: true, externalContactEmail: externalEmail.trim() || undefined });
                    setExternalName(""); setExternalEmail("");
                  }}
                  className="bg-red-600 hover:bg-red-700"
                  data-testid="button-add-external-team"
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">In tournament <span className="text-zinc-500 text-xs">({state.teams.length})</span></h4>
          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {state.teams.length === 0 && <p className="text-zinc-500 text-sm py-4 text-center">No teams added yet</p>}
            {state.teams.map((t: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
                <span className="text-zinc-500 text-xs font-mono w-6">#{i + 1}</span>
                <div className="w-8 h-8 rounded-lg bg-red-600/30 flex items-center justify-center text-xs text-white font-bold">
                  {(t.name || "?").substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white font-semibold">{t.name}</p>
                  {t.isExternal && <p className="text-[10px] text-zinc-500 uppercase">External</p>}
                </div>
                <button onClick={() => removeTeam(i)} className="text-zinc-500 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepSchedule({ state, setState }: any) {
  const [court, setCourt] = useState("");
  const addCourt = () => {
    if (!court.trim()) return;
    setState((s: any) => ({ ...s, courts: [...s.courts, court.trim()] }));
    setCourt("");
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-bold tracking-widest text-red-400 uppercase mb-1">Step 3 of 4</p>
        <h2 className="text-3xl font-bold text-white" style={{ letterSpacing: "-0.02em" }}>Schedule & venue</h2>
        <p className="text-zinc-400 mt-2">Set window, location, and courts so we can pack the schedule for you.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <Label className="text-zinc-400 text-xs uppercase tracking-wider mb-2 block">Start date</Label>
          <Input
            type="date"
            value={state.startDate?.slice(0, 10) || ""}
            onChange={e => setState((s: any) => ({ ...s, startDate: e.target.value }))}
            className="bg-white/5 border-white/10 text-white"
            data-testid="input-start-date"
          />
        </div>
        <div>
          <Label className="text-zinc-400 text-xs uppercase tracking-wider mb-2 block">End date</Label>
          <Input
            type="date"
            value={state.endDate?.slice(0, 10) || ""}
            onChange={e => setState((s: any) => ({ ...s, endDate: e.target.value }))}
            className="bg-white/5 border-white/10 text-white"
            data-testid="input-end-date"
          />
        </div>
        <div className="lg:col-span-2">
          <Label className="text-zinc-400 text-xs uppercase tracking-wider mb-2 block">Venue</Label>
          <Input
            value={state.venue}
            onChange={e => setState((s: any) => ({ ...s, venue: e.target.value }))}
            placeholder="e.g. North Sports Complex"
            className="bg-white/5 border-white/10 text-white"
            data-testid="input-venue"
          />
        </div>
        <div className="lg:col-span-2">
          <Label className="text-zinc-400 text-xs uppercase tracking-wider mb-2 block">Courts / fields</Label>
          <div className="flex gap-2">
            <Input
              value={court}
              onChange={e => setCourt(e.target.value)}
              placeholder="Court 1"
              className="bg-white/5 border-white/10 text-white"
              onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addCourt())}
            />
            <Button onClick={addCourt} className="bg-red-600 hover:bg-red-700">Add</Button>
          </div>
          <div className="flex gap-2 flex-wrap mt-3">
            {state.courts.map((c: string, i: number) => (
              <span key={i} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 font-mono text-xs flex items-center gap-2 text-white">
                <MapPin className="w-3 h-3 text-zinc-500" /> {c}
                <button onClick={() => setState((s: any) => ({ ...s, courts: s.courts.filter((_: any, j: number) => j !== i) }))}>
                  <X className="w-3 h-3 text-zinc-500 hover:text-red-500" />
                </button>
              </span>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2">
          <Label className="text-zinc-400 text-xs uppercase tracking-wider mb-2 block">Description (optional)</Label>
          <Textarea
            value={state.description}
            onChange={e => setState((s: any) => ({ ...s, description: e.target.value }))}
            placeholder="Tell teams what to expect."
            rows={3}
            className="bg-white/5 border-white/10 text-white"
          />
        </div>
        <div className="lg:col-span-2 flex items-center gap-3">
          <input
            type="checkbox"
            id="isPublic"
            checked={state.isPublic}
            onChange={e => setState((s: any) => ({ ...s, isPublic: e.target.checked }))}
            className="w-4 h-4 accent-red-600"
          />
          <label htmlFor="isPublic" className="text-zinc-300 text-sm">Publish to BoxStat Marketplace once live</label>
        </div>
      </div>
    </div>
  );
}

function StepReview({ state }: any) {
  const fmt = FORMAT_OPTIONS.find(f => f.value === state.format)?.label;
  const sp = SPORT_OPTIONS.find(s => s.value === state.sport);
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-bold tracking-widest text-red-400 uppercase mb-1">Step 4 of 4</p>
        <h2 className="text-3xl font-bold text-white" style={{ letterSpacing: "-0.02em" }}>Review</h2>
        <p className="text-zinc-400 mt-2">Looks great. Confirm and we'll save as a draft.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl p-6 border border-white/10" style={{ background: "linear-gradient(145deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))" }}>
          {[
            ["Name", state.name],
            ["Sport", `${sp?.icon} ${sp?.label}`],
            ["Format", fmt],
            ["Age group", state.ageGroup || "Any"],
            ["Teams", state.teams.length],
            ["Window", `${state.startDate} → ${state.endDate}`],
            ["Venue", state.venue],
            ["Courts", state.courts.join(", ") || "—"],
          ].map(([k, v]) => (
            <div key={k as string} className="flex justify-between py-2.5 border-b border-white/5 last:border-0">
              <span className="text-zinc-500 text-sm">{k}</span>
              <span className="text-white text-sm font-semibold">{String(v)}</span>
            </div>
          ))}
        </div>
        <div className="rounded-2xl p-6 border border-white/10 bg-white/[0.03]">
          <p className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-3">After creation</p>
          <ul className="space-y-2 text-sm text-zinc-300">
            <li className="flex gap-2"><Check className="w-4 h-4 text-green-500 flex-shrink-0" /> Saved to your Tournament Hub as a draft.</li>
            <li className="flex gap-2"><Check className="w-4 h-4 text-green-500 flex-shrink-0" /> You'll be taken to the bracket editor.</li>
            <li className="flex gap-2"><Check className="w-4 h-4 text-green-500 flex-shrink-0" /> Publishing creates real game events with RSVP & check-in.</li>
            {state.isPublic && <li className="flex gap-2"><Check className="w-4 h-4 text-green-500 flex-shrink-0" /> Listed on the public Marketplace.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ==================== DETAIL ====================
function TournamentDetail({ tournamentId, teams, onBack, onEdit }: { tournamentId: number; teams: Team[]; onBack: () => void; onEdit?: () => void }) {
  const { toast } = useToast();
  const { data: snapshot, isLoading } = useQuery<any>({
    queryKey: ["/api/tournaments", tournamentId, "snapshot"],
    refetchInterval: 15000,
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/tournaments/${tournamentId}/publish`, { method: "POST" });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", tournamentId, "snapshot"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      toast({ title: "Tournament published", description: `${data.createdEvents} games created.` });
    },
    onError: (e: any) => toast({ title: "Publish failed", description: e.message, variant: "destructive" }),
  });

  const broadcastMutation = useMutation({
    mutationFn: async (msg: string) => {
      return await apiRequest(`/api/tournaments/${tournamentId}/broadcast`, { method: "POST", data: { message: msg } });
    },
    onSuccess: () => toast({ title: "Broadcast sent" }),
  });

  if (isLoading || !snapshot) {
    return (
      <div className="bg-zinc-950 -mx-4 lg:-mx-8 -my-4 lg:-my-8 p-8 min-h-[calc(100vh-200px)] space-y-4" data-testid="tournament-loading">
        <Skeleton className="h-8 w-1/3 bg-white/5" />
        <Skeleton className="h-24 w-full bg-white/5" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-48 bg-white/5" />
          <Skeleton className="h-48 bg-white/5" />
          <Skeleton className="h-48 bg-white/5" />
        </div>
      </div>
    );
  }
  const { tournament, matches, kpi, standings, topScorers, teams: tTeams, events } = snapshot;

  return (
    <div className="bg-zinc-950 -mx-4 lg:-mx-8 -my-4 lg:-my-8 px-4 lg:px-8 py-6 lg:py-8 min-h-[calc(100vh-200px)]" data-testid="tournament-detail">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={onBack} className="text-zinc-400 hover:text-white">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Hub
        </Button>
        <div className="flex gap-2">
          {onEdit && (
            <Button onClick={onEdit} variant="outline" className="bg-white/5 border-white/20 text-white hover:bg-white/10" data-testid="button-edit-tournament">
              Edit
            </Button>
          )}
          {tournament.status === "draft" && (
            <Button onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending} className="bg-red-600 hover:bg-red-700" data-testid="button-publish">
              <Play className="w-4 h-4 mr-1.5" /> {publishMutation.isPending ? "Publishing…" : "Publish & Schedule"}
            </Button>
          )}
          <Button variant="outline" onClick={() => {
            const m = prompt("Broadcast message");
            if (m) broadcastMutation.mutate(m);
          }} className="bg-white/5 border-white/15 text-white hover:bg-white/10">
            <Megaphone className="w-4 h-4 mr-1.5" /> Broadcast
          </Button>
        </div>
      </div>

      {/* Hero */}
      <div className="rounded-2xl border border-red-600/40 p-7 mb-5 relative overflow-hidden" style={{ background: "linear-gradient(135deg,rgba(226,18,36,0.18),rgba(0,0,0,0.6))" }}>
        <div className="flex items-start justify-between gap-4 relative z-10">
          <div>
            <p className="text-[11px] font-bold tracking-widest text-red-400 uppercase mb-2 flex items-center gap-2">
              <StatusPill status={tournament.status} /> {tournament.sport}
            </p>
            <h1 className="text-4xl font-bold text-white" style={{ letterSpacing: "-0.02em" }}>{tournament.name}</h1>
            <p className="text-zinc-400 mt-1">
              {new Date(tournament.startDate).toLocaleDateString()} — {new Date(tournament.endDate).toLocaleDateString()} · {tournament.venue || "TBD"}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mt-6 relative z-10">
          <KPI label="Teams" value={tTeams.length} />
          <KPI label="Matches" value={kpi.totalMatches} />
          <KPI label="Live" value={kpi.liveMatches} accent />
          <KPI label="Completed" value={`${kpi.completedMatches} / ${kpi.totalMatches}`} sub={`${kpi.completionRate}%`} />
        </div>
      </div>

      <Tabs defaultValue={tournament.status === 'live' ? 'live' : 'bracket'} className="text-white">
        <TabsList className="bg-zinc-900 border border-white/10">
          <TabsTrigger value="live" data-testid="tab-live">Live</TabsTrigger>
          <TabsTrigger value="bracket">Bracket</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="standings">Standings</TabsTrigger>
          <TabsTrigger value="leaders">Leaders</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="live">
          <LiveConsoleView snapshot={snapshot} tournament={tournament} matches={matches} standings={standings} kpi={kpi} tournamentId={tournamentId} />
        </TabsContent>
        <TabsContent value="bracket">
          <BracketView matches={matches} teams={tTeams} tournamentId={tournamentId} />
        </TabsContent>
        <TabsContent value="schedule">
          <ScheduleView matches={matches} events={events} tournament={tournament} />
        </TabsContent>
        <TabsContent value="standings">
          <StandingsView standings={standings} />
        </TabsContent>
        <TabsContent value="leaders">
          <LeadersView topScorers={topScorers} />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsView tournament={tournament} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KPI({ label, value, accent, sub }: { label: string; value: any; accent?: boolean; sub?: string }) {
  return (
    <div>
      <p className={`text-3xl font-bold ${accent ? "text-red-500" : "text-white"}`} style={{ letterSpacing: "-0.02em" }}>{value}{sub && <em className="text-base text-red-400 not-italic ml-1">{sub}</em>}</p>
      <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase mt-1">{label}</p>
    </div>
  );
}

function LiveConsoleView({ snapshot, tournament, matches, standings, kpi, tournamentId }: { snapshot: any; tournament: Tournament; matches: Match[]; standings: any[]; kpi: any; tournamentId: number }) {
  const [, navigate] = useLocation();
  const live = matches.filter(m => m.status === 'live');
  const upcoming = matches
    .filter(m => m.status === 'scheduled' || m.status === 'pending')
    .sort((a: any, b: any) => (a.matchNumber || 0) - (b.matchNumber || 0))
    .slice(0, 6);
  const recent = matches.filter(m => m.status === 'completed').slice(-6).reverse();
  const teamName = (id: number | null | undefined) => {
    if (!id) return 'TBD';
    const t = (snapshot?.teams || []).find((x: any) => x.id === id);
    return t?.externalName || t?.name || `Team #${id}`;
  };

  return (
    <div className="space-y-6 mt-6" data-testid="live-console">
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-red-600/40 bg-red-600/[0.07] p-4">
          <p className="text-[10px] font-bold tracking-widest uppercase text-red-400">Now playing</p>
          <p className="text-3xl font-bold text-white mt-1">{live.length}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-500">Up next</p>
          <p className="text-3xl font-bold text-white mt-1">{upcoming.length}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-500">Completed</p>
          <p className="text-3xl font-bold text-white mt-1">{kpi?.completedMatches ?? 0}<span className="text-base text-red-400 ml-1">/{kpi?.totalMatches ?? 0}</span></p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-500">Total points</p>
          <p className="text-3xl font-bold text-white mt-1">{kpi?.totalPoints ?? 0}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Now playing */}
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-zinc-900/50 p-5" data-testid="now-playing-panel">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold">Now playing</h3>
            {live.length > 0 && <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-red-400 font-bold"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>Live</span>}
          </div>
          {live.length === 0 ? (
            <p className="text-zinc-500 text-sm py-6 text-center">Nothing live right now.</p>
          ) : (
            <div className="space-y-2">
              {live.map(m => (
                <div key={m.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-black/40 border border-red-600/20" data-testid={`live-match-${m.id}`}>
                  <div className="flex-1">
                    <p className="text-white font-semibold text-sm">{teamName(m.team1Id)} <span className="text-zinc-500">vs</span> {teamName(m.team2Id)}</p>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-500 mt-0.5">Round {m.round} · {m.court || 'Court TBD'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white tabular-nums">{m.team1Score ?? 0}<span className="text-zinc-600 mx-1">–</span>{m.team2Score ?? 0}</p>
                  </div>
                  {m.eventId && (
                    <Button size="sm" variant="outline" className="bg-white/5 border-white/15 text-white hover:bg-white/10" onClick={() => navigate(`/game-scoring?eventId=${m.eventId}`)} data-testid={`button-score-${m.id}`}>
                      Score
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="mt-6">
            <h4 className="text-white font-bold text-sm mb-2">Up next</h4>
            {upcoming.length === 0 ? (
              <p className="text-zinc-500 text-sm py-3">No upcoming matches.</p>
            ) : (
              <div className="space-y-1.5">
                {upcoming.map(m => (
                  <div key={m.id} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5">
                    <span className="text-zinc-300">{teamName(m.team1Id)} <span className="text-zinc-600">vs</span> {teamName(m.team2Id)}</span>
                    <span className="text-[10px] uppercase tracking-widest text-zinc-500">R{m.round} · {m.court || '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-6">
            <h4 className="text-white font-bold text-sm mb-2">Recent finals</h4>
            {recent.length === 0 ? (
              <p className="text-zinc-500 text-sm py-3">No completed matches yet.</p>
            ) : (
              <div className="space-y-1.5">
                {recent.map(m => (
                  <div key={m.id} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5">
                    <span className="text-zinc-300">{teamName(m.team1Id)} <span className="text-zinc-600">vs</span> {teamName(m.team2Id)}</span>
                    <span className="text-white font-semibold tabular-nums">{m.team1Score ?? 0}–{m.team2Score ?? 0}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Standings ladder */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-5" data-testid="ladder-panel">
          <h3 className="text-white font-bold mb-4">Standings ladder</h3>
          {standings.length === 0 ? (
            <p className="text-zinc-500 text-sm py-6 text-center">No standings yet.</p>
          ) : (
            <ol className="space-y-1.5">
              {standings.slice(0, 8).map((s: any, i: number) => (
                <li key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5">
                  <span className="w-6 text-center text-[11px] font-bold text-zinc-500">{i + 1}</span>
                  <span className="flex-1 text-sm text-white font-semibold truncate">{s.externalName || `Team #${s.teamId}`}</span>
                  <span className="text-[11px] text-zinc-400 tabular-nums">{s.wins || 0}-{s.losses || 0}{s.ties ? `-${s.ties}` : ''}</span>
                </li>
              ))}
            </ol>
          )}
          <div className="mt-5 pt-4 border-t border-white/5">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Parent preview</p>
            <p className="text-xs text-zinc-400 mb-3">Parents and players see this same live data inside the event card on their dashboard.</p>
            {live[0]?.eventId && (
              <Button size="sm" variant="outline" className="bg-white/5 border-white/15 text-white hover:bg-white/10 w-full" onClick={() => navigate(`/events/${live[0].eventId}`)} data-testid="button-open-parent-event">
                Open a parent's event view
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BracketView({ matches, teams, tournamentId }: { matches: Match[]; teams: TTeam[]; tournamentId: number }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  // Local form state. Editing fields no longer fires a mutation per
  // keystroke (which used to close the inspector while typing); the user
  // explicitly clicks Save.
  const [draft, setDraft] = useState<{ court: string }>({ court: "" });

  const teamName = (id?: number | null) => {
    if (!id) return "TBD";
    const t = teams.find(x => x.id === id);
    return t?.externalName || `Team #${t?.teamId || id}`;
  };

  const updateMatch = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiRequest(`/api/tournaments/matches/${id}`, { method: "PATCH", data });
    },
    onSuccess: (updated: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", tournamentId, "snapshot"] });
      toast({ title: "Saved" });
      // Reflect saved values back onto the inspector but keep it open so
      // the user can keep editing the same match.
      if (updated && selectedMatch && updated.id === selectedMatch.id) {
        setSelectedMatch({ ...selectedMatch, ...updated });
      }
    },
  });

  const reseed = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/tournaments/${tournamentId}/ai-reseed`, { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", tournamentId, "snapshot"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", tournamentId, "teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", tournamentId, "matches"] });
      toast({ title: "Bracket re-seeded by AI" });
    },
    onError: (e: any) => toast({ title: "Re-seed failed", description: String(e?.message || e), variant: "destructive" }),
  });

  const openMatch = (m: Match) => {
    setSelectedMatch(m);
    setDraft({ court: m.court || "" });
  };

  if (matches.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-white/10 bg-zinc-900/50 p-12 text-center">
        <Trophy className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
        <p className="text-white font-bold mb-1">No bracket yet</p>
        <p className="text-zinc-500 text-sm">Click Publish & Schedule to generate the bracket.</p>
      </div>
    );
  }

  // Group by round
  const rounds: Record<number, Match[]> = {};
  matches.forEach(m => {
    if (!rounds[m.round]) rounds[m.round] = [];
    rounds[m.round].push(m);
  });
  Object.values(rounds).forEach(arr => arr.sort((a, b) => a.positionInRound - b.positionInRound));
  const sortedRounds = Object.keys(rounds).map(Number).sort((a, b) => a - b);

  return (
    <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
      <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-6 overflow-x-auto" style={{ backgroundImage: "radial-gradient(circle at 1px 1px,rgba(255,255,255,0.05) 1px,transparent 0)", backgroundSize: "24px 24px" }}>
        <div className="flex items-center justify-between mb-4 min-w-max">
          <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Bracket</p>
          <Button
            size="sm"
            variant="outline"
            className="border-white/10 bg-white/5 text-white hover:bg-white/10"
            disabled={reseed.isPending}
            onClick={() => {
              if (confirm("AI re-seed will reshuffle round-1 matchups based on team strength. Existing scores stay intact. Continue?")) {
                reseed.mutate();
              }
            }}
            data-testid="ai-reseed"
          >
            <Sparkles className="w-3 h-3 mr-1.5" /> {reseed.isPending ? "Re-seeding…" : "AI re-seed"}
          </Button>
        </div>
        <div className="flex gap-10 min-w-max">
          {sortedRounds.map(r => (
            <div key={r} className="flex flex-col justify-around gap-4 min-w-[220px]">
              <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase mb-2">Round {r}</p>
              {rounds[r].map(m => (
                <button
                  key={m.id}
                  onClick={() => openMatch(m)}
                  data-testid={`match-${m.id}`}
                  className={`rounded-lg p-3 text-left border transition-all ${
                    selectedMatch?.id === m.id ? "border-red-600 shadow-[0_0_8px_rgba(226,18,36,0.4)]" : "border-white/10"
                  }`}
                  style={{ background: "rgba(20,20,22,0.95)" }}
                >
                  <p className="text-[9px] font-bold tracking-widest text-zinc-500 uppercase mb-1.5">M{m.matchNumber} · {m.status}</p>
                  <div className={`flex justify-between text-sm py-1 ${m.winnerTeamId === m.team1Id ? "text-green-400 font-bold" : "text-white"}`}>
                    <span className="truncate pr-2">{teamName(m.team1Id)}</span>
                    <span className="font-mono">{m.team1Score ?? "-"}</span>
                  </div>
                  <div className={`flex justify-between text-sm py-1 border-t border-white/5 ${m.winnerTeamId === m.team2Id ? "text-green-400 font-bold" : "text-white"}`}>
                    <span className="truncate pr-2">{teamName(m.team2Id)}</span>
                    <span className="font-mono">{m.team2Score ?? "-"}</span>
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      <aside className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
        {selectedMatch ? (
          <div>
            <p className="text-[11px] font-bold tracking-widest text-zinc-500 uppercase mb-3">Match {selectedMatch.matchNumber}</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-white/5 p-3 text-center">
                  <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">{teamName(selectedMatch.team1Id)}</p>
                  <p className="text-3xl font-bold tabular-nums">{selectedMatch.team1Score ?? "—"}</p>
                </div>
                <div className="rounded-lg bg-white/5 p-3 text-center">
                  <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">{teamName(selectedMatch.team2Id)}</p>
                  <p className="text-3xl font-bold tabular-nums">{selectedMatch.team2Score ?? "—"}</p>
                </div>
              </div>
              <p className="text-zinc-500 text-[11px] leading-relaxed">
                Scores are recorded in the existing scoresheet. Open scoring writes to <code className="text-zinc-400">game_sessions</code> and updates the bracket automatically.
              </p>
              <div>
                <Label className="text-zinc-500 text-xs uppercase tracking-wider mb-1 block">Court</Label>
                <Input
                  value={draft.court}
                  onChange={e => setDraft(d => ({ ...d, court: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white"
                  data-testid="inspector-court"
                />
              </div>
              <Button
                className="w-full bg-white/10 hover:bg-white/20 text-white"
                onClick={() => updateMatch.mutate({ id: selectedMatch.id, data: { court: draft.court || null } })}
                disabled={updateMatch.isPending}
                data-testid="inspector-save"
              >
                {updateMatch.isPending ? "Saving…" : "Save match details"}
              </Button>
              <Button
                className="w-full bg-red-600 hover:bg-red-700"
                disabled={!selectedMatch.eventId}
                onClick={() => {
                  if (selectedMatch.eventId) navigate(`/game-scoring?eventId=${selectedMatch.eventId}`);
                }}
                data-testid="open-scoring"
              >
                <Play className="w-4 h-4 mr-2" /> {selectedMatch.eventId ? "Open scoring" : "Publish to enable scoring"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-zinc-500 text-sm text-center py-8">Click a match to inspect or edit.</div>
        )}
      </aside>
    </div>
  );
}

type ScheduleEdit = { court: string; startTime: string; endTime: string };
type EventLite = { id: number; title?: string; startTime?: string; endTime?: string };

function toDatetimeLocal(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const tzOff = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOff).toISOString().slice(0, 16);
}

function ScheduleView({ matches, events, tournament, readOnly }: { matches: Match[]; events: EventLite[]; tournament: Tournament; readOnly?: boolean }) {
  const { toast } = useToast();
  const courts = (tournament.courts && tournament.courts.length) ? tournament.courts : ["Court 1"];
  const courtOptions = ["", ...courts];
  const eventById: Record<number, EventLite> = {};
  (events || []).forEach((e) => { if (e?.id) eventById[Number(e.id)] = e; });

  // Local edit map: matchId -> { court, startTime (datetime-local), endTime }.
  // Court lives on tournament_matches; tip-off + end live on the linked event.
  // Both flush in one batch on Save so the editor stays a single round-trip.
  const [edits, setEdits] = useState<Record<number, ScheduleEdit>>({});

  const initialFor = (m: Match): ScheduleEdit => {
    const ev = m.eventId ? eventById[Number(m.eventId)] : undefined;
    return {
      court: m.court || "",
      startTime: toDatetimeLocal(ev?.startTime),
      endTime: toDatetimeLocal(ev?.endTime),
    };
  };

  const setEdit = (id: number, patch: Partial<ScheduleEdit>) => {
    setEdits(prev => {
      const m = matches.find(x => x.id === id);
      const base = prev[id] || (m ? initialFor(m) : { court: "", startTime: "", endTime: "" });
      return { ...prev, [id]: { ...base, ...patch } };
    });
  };

  const isMatchDirty = (id: number) => {
    const m = matches.find(x => x.id === id); if (!m) return false;
    const draft = edits[id]; if (!draft) return false;
    const orig = initialFor(m);
    return draft.court !== orig.court || draft.startTime !== orig.startTime || draft.endTime !== orig.endTime;
  };
  const dirtyIds = Object.keys(edits).map(Number).filter(isMatchDirty);

  const saveAll = useMutation({
    mutationFn: async () => {
      // Build a single batch payload and POST to the dedicated tournament
      // schedule endpoint. The server handles match-court PATCHes and the
      // linked event-row time/court PATCHes in one place, and returns the
      // authoritative conflict list.
      const updates = dirtyIds.map(id => {
        const m = matches.find(x => x.id === id)!;
        const draft = edits[id];
        const orig = initialFor(m);
        const u: { matchId: number; eventId?: number; court?: string; startTime?: string; endTime?: string } = { matchId: id };
        if (draft.court !== orig.court) u.court = draft.court || undefined;
        if (m.eventId) {
          u.eventId = Number(m.eventId);
          if (draft.startTime !== orig.startTime && draft.startTime) u.startTime = new Date(draft.startTime).toISOString();
          if (draft.endTime !== orig.endTime && draft.endTime) u.endTime = new Date(draft.endTime).toISOString();
        }
        return u;
      });
      return apiRequest(`/api/tournaments/${tournament.id}/schedule`, {
        method: "POST",
        data: { updates },
      }) as Promise<{ ok: boolean; conflicts: Array<{ a: number; b: number; court: string }> }>;
    },
    onSuccess: (resp) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", tournament.id, "snapshot"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", tournament.id, "matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setEdits({});
      const serverConflicts = resp?.conflicts?.length || 0;
      toast({
        title: `Saved ${dirtyIds.length} match${dirtyIds.length === 1 ? '' : 'es'}`,
        description: serverConflicts > 0 ? `${serverConflicts} scheduling conflict${serverConflicts === 1 ? '' : 's'} remain — review the red rows.` : undefined,
      });
    },
    onError: (e) => toast({ title: "Save failed", description: e instanceof Error ? e.message : String(e), variant: "destructive" }),
  });

  // Group by current court (use draft if edited).
  const courtFor = (m: Match) => edits[m.id]?.court ?? (m.court || "");
  const startFor = (m: Match) => edits[m.id]?.startTime ?? toDatetimeLocal(m.eventId ? eventById[Number(m.eventId)]?.startTime : undefined);
  const endFor = (m: Match) => edits[m.id]?.endTime ?? toDatetimeLocal(m.eventId ? eventById[Number(m.eventId)]?.endTime : undefined);
  const groupedMatches = courts.map(c => ({ court: c, matches: matches.filter(m => courtFor(m) === c) }));
  const noCourtMatches = matches.filter(m => !courtFor(m));

  // Conflict detection: two matches sharing the same court whose [start,end)
  // intervals overlap. We collect a set of conflicting match IDs so we can
  // outline them in red and surface a count near the Save button.
  const conflictIds = new Set<number>();
  for (const c of courts) {
    const onCourt = matches.filter(m => courtFor(m) === c).map(m => ({
      id: m.id,
      start: startFor(m) ? new Date(startFor(m)!).getTime() : NaN,
      end: endFor(m) ? new Date(endFor(m)!).getTime() : NaN,
    })).filter(x => !isNaN(x.start) && !isNaN(x.end) && x.end > x.start);
    for (let i = 0; i < onCourt.length; i++) {
      for (let j = i + 1; j < onCourt.length; j++) {
        const a = onCourt[i], b = onCourt[j];
        if (a.start < b.end && b.start < a.end) {
          conflictIds.add(a.id); conflictIds.add(b.id);
        }
      }
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-white/10 bg-zinc-900/50 p-5 overflow-x-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <p className="text-[11px] font-bold tracking-widest text-zinc-500 uppercase">Schedule grid</p>
          {conflictIds.size > 0 && (
            <Badge className="bg-red-600/30 text-red-300 border border-red-600/40" data-testid="schedule-conflicts">
              {conflictIds.size / 2 > 0 ? `${Math.ceil(conflictIds.size / 2)} conflict${conflictIds.size === 2 ? '' : 's'}` : ''}
            </Badge>
          )}
        </div>
        {!readOnly && (
          <Button
            size="sm"
            className="bg-red-600 hover:bg-red-700 disabled:opacity-30"
            disabled={dirtyIds.length === 0 || saveAll.isPending}
            onClick={() => saveAll.mutate()}
            data-testid="save-schedule"
          >
            {saveAll.isPending ? "Saving…" : `Save ${dirtyIds.length || ''} change${dirtyIds.length === 1 ? '' : 's'}`.trim()}
          </Button>
        )}
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${courts.length}, minmax(240px, 1fr))` }}>
        {groupedMatches.map(g => (
          <div key={g.court}>
            <p className="text-white font-bold text-sm mb-3 px-2">{g.court}</p>
            <div className="space-y-2">
              {g.matches.length === 0 && <p className="text-zinc-600 text-xs text-center py-3">No matches</p>}
              {g.matches.map(m => {
                const ev = m.eventId ? eventById[Number(m.eventId)] : null;
                const inConflict = conflictIds.has(m.id);
                return (
                  <div key={m.id} className={`rounded-lg p-3 text-xs border ${
                    inConflict ? "border-red-500/60 bg-red-500/[0.06]" :
                    m.status === "live" ? "border-green-500/40 bg-green-500/[0.06]" : "border-white/10 bg-white/[0.03]"
                  }`}>
                    <div className="flex justify-between mb-1">
                      <span className="text-[9px] font-bold tracking-widest text-zinc-500 uppercase">R{m.round} · M{m.matchNumber}</span>
                      <span className="text-[9px] text-zinc-500">{m.status}</span>
                    </div>
                    <p className="text-white font-semibold leading-tight">{ev?.title?.split(":")?.[1]?.trim() || `Match #${m.matchNumber}`}</p>
                    {inConflict && (
                      <p className="text-red-400 text-[10px] mt-1">Conflicts with another match on this court.</p>
                    )}
                    {!readOnly && (
                      <div className="mt-2 space-y-1.5">
                        <select
                          className="w-full bg-white/5 border border-white/10 rounded px-1 py-1 text-[10px] text-white"
                          value={courtFor(m)}
                          onChange={e => setEdit(m.id, { court: e.target.value })}
                          data-testid={`schedule-court-${m.id}`}
                        >
                          {courtOptions.map(c => (<option key={c || 'none'} value={c}>{c || 'Unassigned'}</option>))}
                        </select>
                        {m.eventId && (
                          <>
                            <input
                              type="datetime-local"
                              className="w-full bg-white/5 border border-white/10 rounded px-1 py-1 text-[10px] text-white"
                              value={startFor(m) || ''}
                              onChange={e => setEdit(m.id, { startTime: e.target.value })}
                              data-testid={`schedule-start-${m.id}`}
                            />
                            <input
                              type="datetime-local"
                              className="w-full bg-white/5 border border-white/10 rounded px-1 py-1 text-[10px] text-white"
                              value={endFor(m) || ''}
                              onChange={e => setEdit(m.id, { endTime: e.target.value })}
                              data-testid={`schedule-end-${m.id}`}
                            />
                          </>
                        )}
                      </div>
                    )}
                    {readOnly && ev?.startTime && (
                      <p className="text-zinc-500 text-[10px] mt-1">{new Date(ev.startTime).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {noCourtMatches.length > 0 && (
        <div className="mt-6">
          <p className="text-zinc-500 text-xs mb-2">Unassigned ({noCourtMatches.length})</p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
            {noCourtMatches.map(m => (
              <div key={m.id} className="rounded-lg p-3 text-xs border border-dashed border-white/15 bg-white/[0.02]">
                <div className="flex items-center justify-between mb-1">
                  <span>R{m.round} M{m.matchNumber}</span>
                  <span className="text-zinc-500">{m.status}</span>
                </div>
                {!readOnly && (
                  <div className="mt-1">
                    <select
                      className="w-full bg-white/5 border border-white/10 rounded px-1 py-1 text-[10px] text-white"
                      value={courtFor(m)}
                      onChange={e => setEdit(m.id, { court: e.target.value })}
                    >
                      {courtOptions.map(c => (<option key={c || 'none'} value={c}>{c || 'Unassigned'}</option>))}
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StandingsView({ standings }: { standings: any[] }) {
  return (
    <div className="mt-6 rounded-xl border border-white/10 bg-zinc-900/50 p-5">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-zinc-500 text-[10px] tracking-widest uppercase">
            <th className="text-left py-2">#</th>
            <th className="text-left">Team</th>
            <th className="text-right">P</th>
            <th className="text-right">W</th>
            <th className="text-right">L</th>
            <th className="text-right">GD</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => (
            <tr key={s.id} className="border-t border-white/5">
              <td className={`py-2 font-mono ${i === 0 ? "text-yellow-400" : "text-zinc-400"}`}>{i + 1}</td>
              <td className="text-white font-semibold">{s.externalName || `Team #${s.teamId}`}</td>
              <td className="text-right text-white">{s.played}</td>
              <td className="text-right text-white">{s.wins || 0}</td>
              <td className="text-right text-white">{s.losses || 0}</td>
              <td className={`text-right font-bold ${s.gd > 0 ? "text-green-400" : s.gd < 0 ? "text-red-400" : "text-zinc-400"}`}>{s.gd > 0 ? "+" : ""}{s.gd}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LeadersView({ topScorers }: { topScorers: any[] }) {
  if (!topScorers || topScorers.length === 0) {
    return <div className="mt-6 text-zinc-500 text-center p-12 rounded-xl border border-white/10 bg-zinc-900/50">No scoring data yet</div>;
  }
  return (
    <div className="mt-6 rounded-xl border border-white/10 bg-zinc-900/50 p-5 space-y-2">
      {topScorers.map((p, i) => (
        <div key={p.playerId} className="flex items-center gap-4 p-3 rounded-lg bg-white/[0.03]">
          <span className={`font-bold text-2xl w-7 ${i === 0 ? "text-yellow-400" : "text-zinc-600"}`}>{i + 1}</span>
          <div className="flex-1">
            <p className="text-white font-bold">{p.playerName}</p>
            <p className="text-zinc-500 text-xs">{p.games} games</p>
          </div>
          <div className="text-right">
            <p className="text-white text-2xl font-bold">{p.points}</p>
            <p className="text-zinc-500 text-[10px] tracking-widest uppercase">PTS</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function SettingsView({ tournament }: { tournament: Tournament }) {
  const { toast } = useToast();
  const [edit, setEdit] = useState({
    name: tournament.name,
    venue: tournament.venue || "",
    description: tournament.description || "",
    isPublic: tournament.isPublic ?? true,
  });
  const updateMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/tournaments/${tournament.id}`, { method: "PATCH", data: edit });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", tournament.id, "snapshot"] });
      toast({ title: "Settings saved" });
    },
  });
  return (
    <div className="mt-6 rounded-xl border border-white/10 bg-zinc-900/50 p-6 space-y-4 max-w-2xl">
      <div>
        <Label className="text-zinc-400 text-xs uppercase tracking-wider mb-1 block">Name</Label>
        <Input value={edit.name} onChange={e => setEdit(s => ({ ...s, name: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
      </div>
      <div>
        <Label className="text-zinc-400 text-xs uppercase tracking-wider mb-1 block">Venue</Label>
        <Input value={edit.venue} onChange={e => setEdit(s => ({ ...s, venue: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
      </div>
      <div>
        <Label className="text-zinc-400 text-xs uppercase tracking-wider mb-1 block">Description</Label>
        <Textarea value={edit.description} onChange={e => setEdit(s => ({ ...s, description: e.target.value }))} rows={4} className="bg-white/5 border-white/10 text-white" />
      </div>
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={edit.isPublic}
          onChange={e => setEdit(s => ({ ...s, isPublic: e.target.checked }))}
          className="w-4 h-4 accent-red-600"
        />
        <span className="text-zinc-300 text-sm">List on public Marketplace</span>
      </div>
      <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} className="bg-red-600 hover:bg-red-700">
        {updateMutation.isPending ? "Saving…" : "Save Settings"}
      </Button>
    </div>
  );
}

// ==================== JOIN REQUESTS DRAWER ====================
function JoinRequestsDrawer({ requests, tournaments, teams, onClose }: { requests: any[]; tournaments: Tournament[]; teams: Team[]; onClose: () => void }) {
  const tournamentName = (id: number) => tournaments.find(t => t.id === id)?.name || `Tournament #${id}`;
  const teamName = (id: any) => {
    if (id == null) return "Unknown team";
    const t = teams.find(t => String(t.id) === String(id));
    return t?.name || `Team #${id}`;
  };
  const fmtDate = (iso?: string) => {
    if (!iso) return "";
    try { return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
    catch { return ""; }
  };
  const { toast } = useToast();
  const respondMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return await apiRequest(`/api/tournament-join-requests/${id}`, { method: "PATCH", data: { status } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournament-join-requests"] });
      toast({ title: "Updated" });
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative ml-auto w-full max-w-md bg-zinc-950 border-l border-white/10 p-6 overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white text-xl font-bold">Join Requests</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        {requests.length === 0 ? (
          <p className="text-zinc-500 text-sm text-center py-12">No requests yet</p>
        ) : (
          <div className="space-y-3">
            {requests.map(r => (
              <div key={r.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-white font-bold">{teamName(r.requesterTeamId)}</p>
                    <p className="text-zinc-400 text-xs mt-0.5">wants to join <span className="text-white">{tournamentName(r.tournamentId)}</span></p>
                    {r.createdAt && <p className="text-zinc-600 text-[11px] mt-1">Requested {fmtDate(r.createdAt)}</p>}
                  </div>
                  <StatusPill status={r.status} />
                </div>
                {r.message && <p className="text-zinc-300 text-sm mt-2 italic">"{r.message}"</p>}
                {r.status !== "pending" && r.respondedAt && (
                  <p className="text-zinc-600 text-[11px] mt-2">Responded {fmtDate(r.respondedAt)}</p>
                )}
                {r.status === "pending" && (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 flex-1" onClick={() => respondMutation.mutate({ id: r.id, status: "approved" })}>
                      <Check className="w-3.5 h-3.5 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="bg-white/5 border-white/15 text-white hover:bg-white/10 flex-1" onClick={() => respondMutation.mutate({ id: r.id, status: "denied" })}>
                      <X className="w-3.5 h-3.5 mr-1" /> Deny
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== EXTERNAL LISTINGS DRAWER ====================
function ExternalListingsDrawer({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const { data: listings = [] } = useQuery<any[]>({ queryKey: ["/api/tournament-external-listings"] });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const blank = { name: "", sport: "basketball", ageGroup: "", startDate: "", endDate: "", location: "", hostName: "", registrationUrl: "", description: "", contactEmail: "" };
  const [form, setForm] = useState(blank);

  const reset = () => { setShowForm(false); setEditingId(null); setForm(blank); };

  const save = useMutation({
    mutationFn: async () => {
      const url = editingId ? `/api/tournament-external-listings/${editingId}` : "/api/tournament-external-listings";
      return await apiRequest(url, { method: editingId ? "PATCH" : "POST", data: form });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournament-external-listings"] });
      toast({ title: editingId ? "Listing updated" : "Listing added" });
      reset();
    },
  });

  const remove = useMutation({
    mutationFn: async (id: number) => apiRequest(`/api/tournament-external-listings/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournament-external-listings"] });
      toast({ title: "Removed" });
    },
  });

  const startEdit = (l: any) => {
    setEditingId(l.id);
    setForm({
      name: l.name || "",
      sport: l.sport || "basketball",
      ageGroup: l.ageGroup || "",
      startDate: l.startDate ? String(l.startDate).slice(0, 10) : "",
      endDate: l.endDate ? String(l.endDate).slice(0, 10) : "",
      location: l.location || "",
      hostName: l.hostName || "",
      registrationUrl: l.registrationUrl || "",
      description: l.description || "",
      contactEmail: l.contactEmail || "",
    });
    setShowForm(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative ml-auto w-full max-w-xl bg-zinc-950 border-l border-white/10 p-6 overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-white text-xl font-bold">{showForm ? (editingId ? "Edit listing" : "New listing") : "External Listings"}</h3>
            <p className="text-zinc-500 text-xs mt-1">Promote tournaments hosted outside BoxStat to the Marketplace.</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {!showForm ? (
          <>
            <Button onClick={() => setShowForm(true)} className="bg-red-600 hover:bg-red-700 mb-4 w-full" data-testid="add-listing">
              <Plus className="w-4 h-4 mr-1.5" /> Add listing
            </Button>
            <div className="space-y-3">
              {listings.length === 0 && <p className="text-zinc-500 text-sm text-center py-8">No listings yet</p>}
              {listings.map(l => (
                <div key={l.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white font-bold">{l.name}</p>
                      <p className="text-zinc-500 text-xs mt-1">{l.sport} · {l.location}</p>
                      <p className="text-zinc-500 text-xs">{new Date(l.startDate).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => startEdit(l)} className="text-zinc-500 hover:text-white" title="Edit" data-testid={`edit-listing-${l.id}`}><Edit className="w-4 h-4" /></button>
                      <button onClick={() => remove.mutate(l.id)} className="text-zinc-500 hover:text-red-500" title="Delete" data-testid={`delete-listing-${l.id}`}><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  {l.registrationUrl && (
                    <a href={l.registrationUrl} target="_blank" rel="noopener" className="text-red-400 text-xs flex items-center gap-1 mt-2">
                      Registration <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <Input placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
            <Select value={form.sport} onValueChange={v => setForm(f => ({ ...f, sport: v }))}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SPORT_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.icon} {s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Age group" value={form.ageGroup} onChange={e => setForm(f => ({ ...f, ageGroup: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
              <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
            </div>
            <Input placeholder="Location" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
            <Input placeholder="Host name" value={form.hostName} onChange={e => setForm(f => ({ ...f, hostName: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
            <Input placeholder="Registration URL" value={form.registrationUrl} onChange={e => setForm(f => ({ ...f, registrationUrl: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
            <Input placeholder="Contact email" value={form.contactEmail} onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
            <Textarea placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="bg-white/5 border-white/10 text-white" />
            <div className="flex gap-2">
              <Button variant="outline" onClick={reset} className="bg-white/5 border-white/15 text-white hover:bg-white/10 flex-1">Cancel</Button>
              <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name || !form.startDate || !form.endDate || !form.location || !form.hostName || !form.registrationUrl} className="bg-red-600 hover:bg-red-700 flex-1" data-testid="save-listing">
                {save.isPending ? "Saving…" : (editingId ? "Update" : "Save")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
