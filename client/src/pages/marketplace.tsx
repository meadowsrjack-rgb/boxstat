import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Calendar, MapPin, ExternalLink, Search, Send, Globe } from "lucide-react";
import { Link } from "wouter";

const SPORT_OPTIONS = [
  { value: "all", label: "All sports", icon: "🏆" },
  { value: "basketball", label: "Basketball", icon: "🏀" },
  { value: "football", label: "Football", icon: "🏈" },
  { value: "soccer", label: "Soccer", icon: "⚽" },
  { value: "baseball", label: "Baseball", icon: "⚾" },
  { value: "volleyball", label: "Volleyball", icon: "🏐" },
];

export default function Marketplace() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [sport, setSport] = useState("all");
  const [source, setSource] = useState<"all" | "boxstat" | "external">("all");
  const [ageGroup, setAgeGroup] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<any>(null);

  const { data: items = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/marketplace"],
  });

  const ageOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((it: any) => { if (it.ageGroup) set.add(it.ageGroup); });
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((it: any) => {
      if (sport !== "all" && it.sport !== sport) return false;
      if (source !== "all" && it.source !== source) return false;
      if (ageGroup !== "all" && it.ageGroup !== ageGroup) return false;
      const term = search.toLowerCase();
      if (term && !it.name?.toLowerCase().includes(term) && !it.venue?.toLowerCase().includes(term) && !it.location?.toLowerCase().includes(term)) return false;
      if (dateFrom && new Date(it.endDate) < new Date(dateFrom)) return false;
      if (dateTo && new Date(it.startDate) > new Date(dateTo)) return false;
      return true;
    });
  }, [items, sport, source, ageGroup, search, dateFrom, dateTo]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white" data-testid="marketplace-page">
      <header className="border-b border-white/5 bg-black sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-red-500" />
            <span className="font-bold text-lg">BoxStat Marketplace</span>
          </Link>
          {user ? (
            <Link href="/home"><Button variant="outline" className="bg-white/5 border-white/15 text-white hover:bg-white/10">My Dashboard</Button></Link>
          ) : (
            <Link href="/login"><Button className="bg-red-600 hover:bg-red-700">Sign In</Button></Link>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 opacity-50" style={{ background: "radial-gradient(circle at 30% 50%, rgba(226,18,36,0.25), transparent 60%)" }} />
        <div className="max-w-7xl mx-auto px-4 py-16 relative">
          <p className="text-[11px] font-bold tracking-widest text-red-400 uppercase mb-2">Public Tournaments</p>
          <h1 className="text-5xl lg:text-6xl font-bold leading-tight" style={{ letterSpacing: "-0.03em" }}>Find your next big stage.</h1>
          <p className="text-zinc-400 text-lg mt-3 max-w-2xl">Browse public tournaments hosted on BoxStat or shared by partner organizations. Join and compete.</p>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_160px_160px] gap-3 mt-8 max-w-3xl">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
              <Input
                placeholder="Search tournaments, cities…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-white/5 border-white/10 text-white pl-9"
                data-testid="marketplace-search"
              />
            </div>
            <Select value={sport} onValueChange={setSport}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="filter-sport"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SPORT_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.icon} {s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={source} onValueChange={(v: any) => setSource(v)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="filter-source"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="boxstat">BoxStat</SelectItem>
                <SelectItem value="external">External</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[160px_160px_160px] gap-3 mt-3 max-w-3xl">
            <Select value={ageGroup} onValueChange={setAgeGroup}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="filter-age"><SelectValue placeholder="Age group" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ages</SelectItem>
                {ageOptions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-white/5 border-white/10 text-white" placeholder="From" data-testid="filter-date-from" />
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-white/5 border-white/10 text-white" placeholder="To" data-testid="filter-date-to" />
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="marketplace-loading">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <div key={i} className="rounded-2xl border border-white/10 p-5 space-y-3" style={{ background: "linear-gradient(145deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))" }}>
                <Skeleton className="h-6 w-3/4 bg-white/5" />
                <Skeleton className="h-4 w-1/2 bg-white/5" />
                <Skeleton className="h-4 w-2/3 bg-white/5" />
                <Skeleton className="h-4 w-1/3 bg-white/5" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-zinc-900/40 p-12 text-center" data-testid="marketplace-empty">
            <Trophy className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-white text-lg font-bold mb-1">No tournaments match your filters</p>
            <p className="text-zinc-500 text-sm">Try widening your search or clearing the date range.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(it => (
              <MarketplaceCard key={`${it.source}-${it.id}`} item={it} onSelect={() => setSelected(it)} />
            ))}
          </div>
        )}
      </section>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white max-w-2xl">
          {selected && <MarketplaceDetail item={selected} user={user} onClose={() => setSelected(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MarketplaceCard({ item, onSelect }: { item: any; onSelect: () => void }) {
  const sport = SPORT_OPTIONS.find(s => s.value === item.sport);
  const start = new Date(item.startDate);
  return (
    <button
      onClick={onSelect}
      data-testid={`marketplace-card-${item.source}-${item.id}`}
      className="text-left rounded-2xl p-5 border border-white/10 transition-all hover:-translate-y-1 hover:border-red-600/40"
      style={{ background: "linear-gradient(145deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))" }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-2xl">{sport?.icon || "🏆"}</div>
          <div>
            <h3 className="text-lg font-bold" style={{ letterSpacing: "-0.02em" }}>{item.name}</h3>
            <p className="text-zinc-500 text-[11px] uppercase tracking-wider mt-1">{item.ageGroup || "Open"}</p>
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase border ${
          item.source === "boxstat" ? "bg-red-600/20 text-red-300 border-red-600/40" : "bg-purple-600/20 text-purple-300 border-purple-600/40"
        }`}>
          {item.source === "boxstat" ? "BoxStat" : "External"}
        </span>
      </div>
      <div className="space-y-1.5 text-sm text-zinc-400">
        <p className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-zinc-500" /> {start.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p>
        <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-zinc-500" /> {item.venue || item.location || "TBD"}</p>
        {item.hostName && <p className="flex items-center gap-2"><Globe className="w-3.5 h-3.5 text-zinc-500" /> {item.hostName}</p>}
      </div>
    </button>
  );
}

function MarketplaceDetail({ item, user, onClose }: { item: any; user: any; onClose: () => void }) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [requesterTeamId, setRequesterTeamId] = useState<string>("");

  const { data: myTeams = [] } = useQuery<any[]>({
    queryKey: ["/api/teams"],
    enabled: !!user && item.source === "boxstat",
  });

  const requestJoin = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/tournament-join-requests", {
        method: "POST",
        data: { tournamentId: item.id, requesterTeamId: parseInt(requesterTeamId), message },
      });
    },
    onSuccess: () => {
      toast({ title: "Request sent", description: "The host will review your request." });
      onClose();
    },
    onError: (e: any) => toast({ title: "Could not send", description: e.message, variant: "destructive" }),
  });

  const sport = SPORT_OPTIONS.find(s => s.value === item.sport);
  const sameOrg = user?.organizationId && item.organizationId && user.organizationId === item.organizationId;
  const canRequest = user && (user.role === "admin" || user.role === "coach") && item.source === "boxstat" && !sameOrg;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center text-2xl">{sport?.icon || "🏆"}</div>
        <div className="flex-1">
          <DialogTitle className="text-2xl font-bold">{item.name}</DialogTitle>
          <p className="text-zinc-500 text-xs uppercase tracking-wider mt-1">{sport?.label} · {item.ageGroup || "Open"}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-white/[0.03] border border-white/10 p-3">
          <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Dates</p>
          <p>{new Date(item.startDate).toLocaleDateString()} → {new Date(item.endDate).toLocaleDateString()}</p>
        </div>
        <div className="rounded-lg bg-white/[0.03] border border-white/10 p-3">
          <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Venue</p>
          <p>{item.venue || item.location || "TBD"}</p>
        </div>
        {item.hostName && (
          <div className="rounded-lg bg-white/[0.03] border border-white/10 p-3 col-span-2">
            <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">Host</p>
            <p>{item.hostName}</p>
          </div>
        )}
      </div>

      {item.description && <p className="text-zinc-300 text-sm leading-relaxed">{item.description}</p>}

      {item.source === "external" ? (
        item.registrationUrl && (
          <a href={item.registrationUrl} target="_blank" rel="noopener noreferrer">
            <Button className="w-full bg-red-600 hover:bg-red-700">
              <ExternalLink className="w-4 h-4 mr-2" /> Register on partner site
            </Button>
          </a>
        )
      ) : null}

      {item.source === "boxstat" && (
        <Link href={`/tournaments/${item.id}`}>
          <Button variant="outline" className="w-full bg-white/5 border-white/15 text-white hover:bg-white/10" data-testid="view-public-detail">
            View bracket, schedule & standings
          </Button>
        </Link>
      )}

      {canRequest ? (
        <div className="space-y-3 pt-3 border-t border-white/5">
          <p className="text-sm font-bold">Request to join</p>
          <Select value={requesterTeamId} onValueChange={setRequesterTeamId}>
            <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Pick a team" /></SelectTrigger>
            <SelectContent>
              {myTeams.map((t: any) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Optional note to the host"
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={3}
            className="bg-white/5 border-white/10 text-white"
          />
          <Button
            disabled={!requesterTeamId || requestJoin.isPending}
            onClick={() => requestJoin.mutate()}
            className="w-full bg-red-600 hover:bg-red-700"
            data-testid="request-join-button"
          >
            <Send className="w-4 h-4 mr-2" /> {requestJoin.isPending ? "Sending…" : "Send request"}
          </Button>
        </div>
      ) : sameOrg ? (
        <p className="text-zinc-500 text-sm text-center py-2">You host this tournament.</p>
      ) : !user ? (
        <Link href="/login">
          <Button className="w-full bg-red-600 hover:bg-red-700">Sign in to request to join</Button>
        </Link>
      ) : (
        <p className="text-zinc-500 text-sm text-center py-2">Only admins or coaches can request to join.</p>
      )}
    </div>
  );
}
