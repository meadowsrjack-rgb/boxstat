import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Trophy, Calendar, MapPin, ArrowLeft, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const SPORT_ICONS: Record<string, string> = {
  basketball: "🏀", soccer: "⚽", baseball: "⚾", football: "🏈",
  volleyball: "🏐", hockey: "🏒", lacrosse: "🥍", tennis: "🎾",
};

export default function TournamentPublicPage() {
  const [, params] = useRoute("/tournaments/:id");
  const id = params?.id ? parseInt(params.id) : 0;

  const { data: snapshot, isLoading, error } = useQuery<any>({
    queryKey: ["/api/tournaments", id, "snapshot"],
    enabled: !!id,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <Skeleton className="h-8 w-32 bg-white/5" />
          <Skeleton className="h-24 w-full bg-white/5" />
          <Skeleton className="h-64 w-full bg-white/5" />
        </div>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-6 grid place-items-center">
        <div className="text-center space-y-3">
          <Trophy className="w-12 h-12 text-zinc-700 mx-auto" />
          <p className="text-lg font-bold">Tournament not found</p>
          <p className="text-zinc-500 text-sm">It may be private or unpublished.</p>
          <Link href="/marketplace"><Button variant="outline" className="bg-white/5 border-white/15 text-white hover:bg-white/10">Back to marketplace</Button></Link>
        </div>
      </div>
    );
  }

  const t = snapshot.tournament;
  const teams: any[] = snapshot.teams || [];
  const matches: any[] = snapshot.matches || [];
  const standings: any[] = snapshot.standings || [];
  const events: any[] = snapshot.events || [];
  const courts: string[] = (t.courts && t.courts.length) ? t.courts : ["Court 1"];
  const sportIcon = SPORT_ICONS[t.sport] || "🏆";

  const teamName = (id?: number | null) => {
    if (!id) return "TBD";
    const tt = teams.find(x => x.id === id);
    return tt?.externalName || `Team #${tt?.teamId || id}`;
  };

  const rounds: Record<number, any[]> = {};
  matches.forEach((m: any) => {
    if (!rounds[m.round]) rounds[m.round] = [];
    rounds[m.round].push(m);
  });
  Object.values(rounds).forEach(arr => arr.sort((a: any, b: any) => a.positionInRound - b.positionInRound));
  const sortedRounds = Object.keys(rounds).map(Number).sort((a, b) => a - b);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-white/10 bg-zinc-950/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/marketplace" className="flex items-center gap-2 text-zinc-400 hover:text-white">
            <ArrowLeft className="w-4 h-4" /> <span className="text-sm">Back to marketplace</span>
          </Link>
          <Link href="/login"><Button size="sm" className="bg-red-600 hover:bg-red-700">Sign In</Button></Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="rounded-2xl border border-white/10 p-6" style={{ background: "linear-gradient(145deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))" }}>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center text-3xl">{sportIcon}</div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold" style={{ letterSpacing: "-0.02em" }}>{t.name}</h1>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-zinc-400">
                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-zinc-500" />{new Date(t.startDate).toLocaleDateString()} – {new Date(t.endDate).toLocaleDateString()}</span>
                {t.venue && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-zinc-500" />{t.venue}</span>}
                {t.ageGroup && <span className="flex items-center gap-1.5"><Globe className="w-4 h-4 text-zinc-500" />{t.ageGroup}</span>}
              </div>
              {t.description && <p className="text-zinc-300 mt-3 text-sm leading-relaxed">{t.description}</p>}
            </div>
          </div>
        </div>

        <section>
          <h2 className="text-[11px] font-bold tracking-widest text-zinc-500 uppercase mb-3">Bracket</h2>
          {sortedRounds.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-8 text-center text-zinc-500 text-sm">No bracket published yet.</div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-6 overflow-x-auto" style={{ backgroundImage: "radial-gradient(circle at 1px 1px,rgba(255,255,255,0.05) 1px,transparent 0)", backgroundSize: "24px 24px" }}>
              <div className="flex gap-10 min-w-max">
                {sortedRounds.map(r => (
                  <div key={r} className="flex flex-col justify-around gap-4 min-w-[220px]">
                    <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase mb-2">Round {r}</p>
                    {rounds[r].map((m: any) => (
                      <div key={m.id} className="rounded-lg p-3 text-left border border-white/10" style={{ background: "rgba(20,20,22,0.95)" }} data-testid={`public-match-${m.id}`}>
                        <p className="text-[9px] font-bold tracking-widest text-zinc-500 uppercase mb-1.5">M{m.matchNumber} · {m.status}</p>
                        <div className={`flex justify-between text-sm py-1 ${m.winnerTeamId === m.team1Id ? "text-green-400 font-bold" : "text-white"}`}>
                          <span className="truncate pr-2">{teamName(m.team1Id)}</span>
                          <span className="font-mono">{m.team1Score ?? "-"}</span>
                        </div>
                        <div className={`flex justify-between text-sm py-1 border-t border-white/5 ${m.winnerTeamId === m.team2Id ? "text-green-400 font-bold" : "text-white"}`}>
                          <span className="truncate pr-2">{teamName(m.team2Id)}</span>
                          <span className="font-mono">{m.team2Score ?? "-"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section>
            <h2 className="text-[11px] font-bold tracking-widest text-zinc-500 uppercase mb-3">Schedule</h2>
            <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4 space-y-3">
              {courts.map(c => {
                const cm = matches.filter((m: any) => m.court === c);
                if (cm.length === 0) return null;
                return (
                  <div key={c}>
                    <p className="text-white text-sm font-bold mb-2">{c}</p>
                    <div className="space-y-1.5">
                      {cm.map((m: any) => {
                        const ev = events.find((e: any) => e?.id === m.eventId);
                        return (
                          <div key={m.id} className="text-xs text-zinc-300 flex justify-between border-l-2 border-white/10 pl-2">
                            <span>R{m.round} · {teamName(m.team1Id)} vs {teamName(m.team2Id)}</span>
                            {ev?.startTime && <span className="text-zinc-500">{new Date(ev.startTime).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {matches.filter((m: any) => !m.court).length > 0 && (
                <p className="text-zinc-500 text-xs">{matches.filter((m: any) => !m.court).length} match(es) unscheduled</p>
              )}
              {matches.length === 0 && <p className="text-zinc-500 text-sm text-center py-3">Schedule pending.</p>}
            </div>
          </section>

          <section>
            <h2 className="text-[11px] font-bold tracking-widest text-zinc-500 uppercase mb-3">Standings</h2>
            <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
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
                  {standings.map((s: any, i: number) => (
                    <tr key={s.id} className="border-t border-white/5">
                      <td className={`py-2 font-mono ${i === 0 ? "text-yellow-400" : "text-zinc-400"}`}>{i + 1}</td>
                      <td className="text-white font-semibold">{s.externalName || `Team #${s.teamId}`}</td>
                      <td className="text-right text-white">{s.played}</td>
                      <td className="text-right text-white">{s.wins || 0}</td>
                      <td className="text-right text-white">{s.losses || 0}</td>
                      <td className={`text-right font-bold ${s.gd > 0 ? "text-green-400" : s.gd < 0 ? "text-red-400" : "text-zinc-400"}`}>{s.gd > 0 ? "+" : ""}{s.gd}</td>
                    </tr>
                  ))}
                  {standings.length === 0 && <tr><td colSpan={6} className="text-center text-zinc-500 py-3 text-sm">No standings yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {snapshot.topScorers && snapshot.topScorers.length > 0 && (
          <section>
            <h2 className="text-[11px] font-bold tracking-widest text-zinc-500 uppercase mb-3">Top scorers</h2>
            <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
              <ol className="space-y-2">
                {snapshot.topScorers.slice(0, 10).map((p: any, i: number) => (
                  <li key={p.playerId} className="flex justify-between text-sm">
                    <span className="text-white"><span className="text-zinc-500 mr-2 font-mono">{i + 1}.</span>{p.playerName || p.playerId}</span>
                    <span className="text-zinc-300 font-mono">{p.points} pts · {p.games} g</span>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
