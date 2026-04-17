import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

type GameStatRow = {
  id: number;
  teamScore?: number | null;
  opponentScore?: number | null;
  opponentName?: string | null;
  eventTitle?: string | null;
  eventDate?: string | null;
  playerStats?: {
    fgm?: number; fga?: number; tpm?: number; tpa?: number;
    ftm?: number; fta?: number; oreb?: number; dreb?: number;
    ast?: number; stl?: number; blk?: number; tov?: number;
    pf?: number; timePlayed?: number;
  } | null;
};

export function ApprovedSeasonStats({ playerId, compact = false }: { playerId?: string; compact?: boolean }) {
  const { data: games = [], isLoading } = useQuery<GameStatRow[]>({
    queryKey: ["/api/players", playerId, "game-stats"],
    enabled: !!playerId,
  });

  const totals = useMemo(() => {
    const t = { gp: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, fgm: 0, fga: 0 };
    games.forEach((g) => {
      const ps = g.playerStats;
      if (!ps) return;
      const fgm = ps.fgm || 0, tpm = ps.tpm || 0, ftm = ps.ftm || 0;
      t.gp += 1;
      t.pts += fgm * 2 + tpm * 3 + ftm;
      t.reb += (ps.oreb || 0) + (ps.dreb || 0);
      t.ast += ps.ast || 0;
      t.stl += ps.stl || 0;
      t.blk += ps.blk || 0;
      t.fgm += fgm;
      t.fga += ps.fga || 0;
    });
    return t;
  }, [games]);

  const ppg = totals.gp ? (totals.pts / totals.gp).toFixed(1) : "—";
  const rpg = totals.gp ? (totals.reb / totals.gp).toFixed(1) : "—";
  const apg = totals.gp ? (totals.ast / totals.gp).toFixed(1) : "—";
  const fgPct = totals.fga ? `${Math.round((totals.fgm / totals.fga) * 100)}%` : "—";

  const recent = useMemo(
    () =>
      [...games]
        .sort((a, b) => new Date(b.eventDate || 0).getTime() - new Date(a.eventDate || 0).getTime())
        .slice(0, 5),
    [games],
  );

  const cards = [
    { label: "PPG", value: ppg },
    { label: "RPG", value: rpg },
    { label: "APG", value: apg },
    { label: "FG%", value: fgPct },
  ];

  return (
    <div className={compact ? "" : "px-4 md:px-0 mt-2"} data-testid="section-season-stats">
      <div className={compact ? "" : "border-t border-gray-100 pt-3"}>
        <div className="flex items-center gap-2 px-1 mb-1">
          <span className="text-sm font-medium text-gray-700">Season Stats</span>
          {totals.gp > 0 && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
              {totals.gp} {totals.gp === 1 ? "game" : "games"}
            </span>
          )}
        </div>
        <div className="grid grid-cols-4 gap-0 px-2 pb-2">
          {cards.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center py-2" data-testid={`stat-${stat.label.toLowerCase()}`}>
              <span className="text-xl md:text-2xl font-bold text-gray-900">{isLoading ? "…" : stat.value}</span>
              <span className="text-[11px] md:text-xs font-medium text-gray-500">{stat.label}</span>
            </div>
          ))}
        </div>
        {recent.length > 0 && (
          <div className="px-2 pb-3" data-testid="list-recent-games">
            <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">Recent Games</div>
            <div className="space-y-1.5">
              {recent.map((g) => {
                const ps = g.playerStats || {};
                const fgm = ps.fgm || 0, fga = ps.fga || 0;
                const tpm = ps.tpm || 0, tpa = ps.tpa || 0;
                const ftm = ps.ftm || 0, fta = ps.fta || 0;
                const pts = fgm * 2 + tpm * 3 + ftm;
                const reb = (ps.oreb || 0) + (ps.dreb || 0);
                const ast = ps.ast || 0;
                const minPlayed = ps.timePlayed != null ? Math.round((ps.timePlayed || 0) / 60) : 0;
                const fgPctRow = fga ? `${Math.round((fgm / fga) * 100)}%` : "—";
                const tpPctRow = tpa ? `${Math.round((tpm / tpa) * 100)}%` : "—";
                const ftPctRow = fta ? `${Math.round((ftm / fta) * 100)}%` : "—";
                const ts = g.teamScore ?? 0;
                const os = g.opponentScore ?? 0;
                const result = ts > os ? "W" : ts < os ? "L" : "T";
                const resultColor = ts > os ? "text-green-600" : ts < os ? "text-red-600" : "text-gray-500";
                const opp = g.opponentName || "OPP";
                const dt = g.eventDate ? new Date(g.eventDate) : null;
                const dateStr = dt ? dt.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
                return (
                  <div key={g.id} className="bg-gray-50 rounded-md px-2.5 py-1.5" data-testid={`game-row-${g.id}`}>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`font-bold ${resultColor}`}>{result}</span>
                        <span className="text-gray-700 truncate">vs {opp}</span>
                        <span className="text-gray-400">·</span>
                        <span className="text-gray-500 font-mono">{ts}-{os}</span>
                      </div>
                      {dateStr && <span className="text-gray-400 text-[11px]">{dateStr}</span>}
                    </div>
                    <div className="mt-1 grid grid-cols-7 gap-1 text-[10px] font-mono text-gray-700">
                      <div className="flex flex-col items-center"><span className="text-gray-400">MIN</span><span>{minPlayed}</span></div>
                      <div className="flex flex-col items-center"><span className="text-gray-400">PTS</span><span>{pts}</span></div>
                      <div className="flex flex-col items-center"><span className="text-gray-400">REB</span><span>{reb}</span></div>
                      <div className="flex flex-col items-center"><span className="text-gray-400">AST</span><span>{ast}</span></div>
                      <div className="flex flex-col items-center"><span className="text-gray-400">FG%</span><span>{fgPctRow}</span></div>
                      <div className="flex flex-col items-center"><span className="text-gray-400">3P%</span><span>{tpPctRow}</span></div>
                      <div className="flex flex-col items-center"><span className="text-gray-400">FT%</span><span>{ftPctRow}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
