import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Activity, MapPin, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  tournamentId: number;
  currentEventId?: string | number;
}

interface MyTeamRow { id: number; }

export default function TournamentBlock({ tournamentId, currentEventId }: Props) {
  const { user } = useAuth();
  const { data: snapshot, isLoading } = useQuery<any>({
    queryKey: ["/api/tournaments", tournamentId, "snapshot"],
    refetchInterval: 30000,
  });
  // Pull the user's teams so we can highlight "your team" rows.
  const { data: myTeams = [] } = useQuery<MyTeamRow[]>({
    queryKey: ["/api/users", user?.id, "teams"],
    enabled: !!user?.id,
  });

  if (isLoading || !snapshot) return null;
  const { tournament, matches, kpi, standings, topScorers, teams: tTeams, events } = snapshot;

  const myTeamIdSet = new Set((myTeams || []).map((t: MyTeamRow) => t.id));
  // Resolve which tournament_team rows belong to the current user.
  const myTournamentTeamIds = new Set(
    (tTeams || []).filter((t: any) => t.teamId && myTeamIdSet.has(t.teamId)).map((t: any) => t.id)
  );
  const isMine = (tournamentTeamId?: number | null) => !!(tournamentTeamId && myTournamentTeamIds.has(tournamentTeamId));

  const teamName = (id?: number | null) => {
    if (!id) return "TBD";
    const t = tTeams.find((x: any) => x.id === id);
    return t?.externalName || `Team #${t?.teamId || id}`;
  };

  const liveMatch = matches.find((m: any) => m.status === "live") || matches.find((m: any) => m.eventId === Number(currentEventId));

  return (
    <div className="rounded-xl border border-purple-500/30 overflow-hidden" data-testid="tournament-block" style={{ background: "linear-gradient(135deg,rgba(139,92,246,0.12),rgba(255,255,255,0.02))" }}>
      <div className="p-4 border-b border-purple-500/20 flex items-start justify-between gap-3">
        <div className="flex gap-3 items-start">
          <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-widest text-purple-400 uppercase">Tournament</p>
            <h3 className="text-base font-bold text-white">{tournament.name}</h3>
            <p className="text-zinc-500 text-xs flex items-center gap-1.5 mt-0.5">
              <MapPin className="w-3 h-3" /> {tournament.venue || "TBD"}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-purple-400 text-xs font-bold">{kpi.completedMatches}/{kpi.totalMatches}</p>
          <p className="text-zinc-500 text-[9px] uppercase tracking-widest">Matches</p>
        </div>
      </div>

      {liveMatch && (
        <div className="p-4 border-b border-purple-500/10 bg-green-500/5">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-3.5 h-3.5 text-green-400" />
            <p className="text-[10px] font-bold tracking-widest text-green-400 uppercase">Live now</p>
            {(isMine(liveMatch.team1Id) || isMine(liveMatch.team2Id)) && (
              <span className="text-[10px] font-bold tracking-widest text-purple-300 uppercase flex items-center gap-1"><Star className="w-3 h-3" /> Your team</span>
            )}
          </div>
          <div className="flex justify-between items-center">
            <span className={`font-bold text-sm ${isMine(liveMatch.team1Id) ? "text-purple-300" : "text-white"}`}>{teamName(liveMatch.team1Id)}</span>
            <span className="text-white font-mono font-bold text-lg">{liveMatch.team1Score ?? 0} – {liveMatch.team2Score ?? 0}</span>
            <span className={`font-bold text-sm ${isMine(liveMatch.team2Id) ? "text-purple-300" : "text-white"}`}>{teamName(liveMatch.team2Id)}</span>
          </div>
        </div>
      )}

      <Tabs defaultValue="schedule" className="text-white">
        <TabsList className="bg-transparent border-b border-purple-500/10 w-full justify-start rounded-none">
          <TabsTrigger value="schedule" className="text-xs">Schedule</TabsTrigger>
          <TabsTrigger value="standings" className="text-xs">Standings</TabsTrigger>
          <TabsTrigger value="bracket" className="text-xs">Bracket</TabsTrigger>
          <TabsTrigger value="leaders" className="text-xs">Leaders</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="p-4 max-h-72 overflow-y-auto">
          <div className="space-y-2">
            {matches.slice(0, 12).map((m: any) => {
              const ev = events?.find((e: any) => e?.id === m.eventId);
              const isCurrent = m.eventId === Number(currentEventId);
              const mine = isMine(m.team1Id) || isMine(m.team2Id);
              const cls = isCurrent
                ? "bg-purple-600/20 border border-purple-500/40"
                : mine
                  ? "bg-purple-600/10 border border-purple-500/30"
                  : "bg-white/[0.03]";
              return (
                <div key={m.id} className={`flex items-center gap-3 p-2.5 rounded-lg text-sm ${cls}`} data-testid={mine ? "schedule-row-mine" : "schedule-row"}>
                  <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase w-12">R{m.round}M{m.matchNumber}</span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate">
                      <span className={isMine(m.team1Id) ? "text-purple-300 font-bold" : "text-white"}>{teamName(m.team1Id)}</span>
                      <span className="text-zinc-500"> vs </span>
                      <span className={isMine(m.team2Id) ? "text-purple-300 font-bold" : "text-white"}>{teamName(m.team2Id)}</span>
                    </p>
                    {ev?.startTime && <p className="text-zinc-500 text-xs">{new Date(ev.startTime).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" })}</p>}
                  </div>
                  <span className="text-xs font-mono text-zinc-400">{m.team1Score ?? "-"}-{m.team2Score ?? "-"}</span>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="standings" className="p-4 max-h-72 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-[9px] uppercase tracking-widest">
                <th className="text-left py-1">#</th>
                <th className="text-left">Team</th>
                <th className="text-right">W</th>
                <th className="text-right">L</th>
                <th className="text-right">GD</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s: any, i: number) => {
                const mine = isMine(s.id);
                return (
                  <tr key={s.id} className={`border-t border-white/5 ${mine ? "bg-purple-600/10" : ""}`} data-testid={mine ? "standings-row-mine" : "standings-row"}>
                    <td className={`py-1.5 ${i === 0 ? "text-yellow-400 font-bold" : "text-zinc-500"}`}>{i + 1}</td>
                    <td className={mine ? "text-purple-300 font-bold" : "text-white"}>{s.externalName || `Team #${s.teamId}`}{mine && <Star className="inline w-3 h-3 ml-1 text-purple-300" />}</td>
                    <td className="text-right text-white">{s.wins || 0}</td>
                    <td className="text-right text-white">{s.losses || 0}</td>
                    <td className={`text-right ${s.gd > 0 ? "text-green-400" : s.gd < 0 ? "text-red-400" : "text-zinc-500"}`}>{s.gd > 0 ? "+" : ""}{s.gd}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TabsContent>

        <TabsContent value="bracket" className="p-4 max-h-72 overflow-x-auto">
          <div className="flex gap-4">
            {Array.from(new Set(matches.map((m: any) => m.round))).sort().map((r: any) => (
              <div key={r} className="min-w-[140px]">
                <p className="text-[9px] font-bold tracking-widest text-zinc-500 uppercase mb-2">R{r}</p>
                <div className="space-y-2">
                  {matches.filter((m: any) => m.round === r).map((m: any) => {
                    const mine = isMine(m.team1Id) || isMine(m.team2Id);
                    return (
                      <div key={m.id} className={`rounded p-2 border text-[11px] ${mine ? "bg-purple-600/10 border-purple-500/40" : "bg-white/[0.03] border-white/5"}`}>
                        <div className={`flex justify-between ${m.winnerTeamId === m.team1Id ? "text-green-400 font-bold" : isMine(m.team1Id) ? "text-purple-300 font-bold" : "text-white"}`}>
                          <span className="truncate pr-1">{teamName(m.team1Id)}</span>
                          <span className="font-mono">{m.team1Score ?? "-"}</span>
                        </div>
                        <div className={`flex justify-between border-t border-white/5 pt-1 mt-1 ${m.winnerTeamId === m.team2Id ? "text-green-400 font-bold" : isMine(m.team2Id) ? "text-purple-300 font-bold" : "text-white"}`}>
                          <span className="truncate pr-1">{teamName(m.team2Id)}</span>
                          <span className="font-mono">{m.team2Score ?? "-"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="leaders" className="p-4 max-h-72 overflow-y-auto">
          {(!topScorers || topScorers.length === 0) ? (
            <p className="text-zinc-500 text-sm text-center py-4">No scoring data yet</p>
          ) : (
            <div className="space-y-2">
              {topScorers.slice(0, 5).map((p: any, i: number) => (
                <div key={p.playerId} className="flex items-center gap-3 p-2 rounded bg-white/[0.03]">
                  <span className={`font-bold w-5 ${i === 0 ? "text-yellow-400" : "text-zinc-500"}`}>{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-white text-sm">{p.playerName}</p>
                    <p className="text-zinc-500 text-xs">{p.games} games</p>
                  </div>
                  <p className="text-white font-bold">{p.points}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
