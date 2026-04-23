import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { usePlayerAccess } from "@/hooks/usePlayerAccess";
import { AccessPaywall } from "@/components/AccessPaywall";
import { ArrowLeft } from "lucide-react";

const HOLD_DELAY = 450;

const initStats = () => ({
  fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0,
  oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, tov: 0, pf: 0,
  timePlayed: 0, onCourt: false,
});

type PlayerStats = ReturnType<typeof initStats>;
type PlayerInfo = { id: string; name: string; num: string; fromRsvp?: boolean };

const pct = (m: number, a: number) => (a === 0 ? "—" : `${Math.round((m / a) * 100)}%`);
const pts = (s: PlayerStats) => s.fgm * 2 + s.tpm * 3 + s.ftm;
const reb = (s: PlayerStats) => s.oreb + s.dreb;
const fmtTime = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s2 = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s2).padStart(2, "0")}`;
};
const fmtMins = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s2 = sec % 60;
  return `${m}:${String(s2).padStart(2, "0")}`;
};
const otLabel = (n: number) => (n === 1 ? "OT" : `${n}OT`);

function parseApiError(err: any, fallback: string): string {
  const raw = err?.message || "";
  const m = raw.match(/^\d+:\s*(.*)$/s);
  const body = m ? m[1] : raw;
  try {
    const parsed = JSON.parse(body);
    if (parsed && typeof parsed.message === "string") return parsed.message;
  } catch {}
  return body || fallback;
}

function useHold(onTap: () => void, onHold: () => void) {
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const f = useRef(false);
  const start = useCallback((e: React.PointerEvent) => { e.preventDefault(); f.current = false; t.current = setTimeout(() => { f.current = true; onHold(); }, HOLD_DELAY); }, [onHold]);
  const end = useCallback((e: React.PointerEvent) => { e.preventDefault(); if (t.current) clearTimeout(t.current); if (!f.current) onTap(); }, [onTap]);
  const cancel = useCallback(() => { if (t.current) clearTimeout(t.current); }, []);
  return { onPointerDown: start, onPointerUp: end, onPointerLeave: cancel, onContextMenu: (e: React.MouseEvent) => e.preventDefault() };
}

const btnBase: React.CSSProperties = {
  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
  width: "100%", borderRadius: 10, cursor: "pointer", padding: "4px 2px",
  transition: "all 0.15s", userSelect: "none", WebkitUserSelect: "none" as any, touchAction: "manipulation",
};

function ShootBtn({ label, value, onTap, onHold, color, variant }: { label: string; value: number; onTap: () => void; onHold: () => void; color: string; variant: "made" | "miss" }) {
  const h = useHold(onTap, onHold);
  const made = variant === "made";
  return (
    <button {...h} style={{ ...btnBase, minHeight: 46, background: made ? `${color}20` : "rgba(255,255,255,0.03)", border: made ? `2px solid ${color}55` : "2px solid rgba(255,255,255,0.07)" }}>
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, color: made ? color : "rgba(255,255,255,0.35)", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontSize: 20, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.1, color: made ? "#fff" : "rgba(255,255,255,0.55)" }}>{value}</span>
    </button>
  );
}

function CounterBtn({ label, value, onTap, onHold, color, warn }: { label: string; value: number; onTap: () => void; onHold: () => void; color: string; warn?: boolean }) {
  const h = useHold(onTap, onHold);
  return (
    <button {...h} style={{ ...btnBase, minHeight: 40, borderRadius: 8, background: value > 0 ? `${color}12` : "rgba(255,255,255,0.02)", border: value > 0 ? `1.5px solid ${color}30` : "1.5px solid rgba(255,255,255,0.06)" }}>
      <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: 0.4, color: value > 0 ? color : "rgba(255,255,255,0.3)", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontSize: 16, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.1, color: warn && value >= 5 ? "#ff4444" : (value > 0 ? "#fff" : "rgba(255,255,255,0.3)") }}>{value}</span>
    </button>
  );
}

function PlayerRow({ player, stats, onUpdate, onNameChange, onToggleSub, clockRunning, locked }: {
  player: PlayerInfo; stats: PlayerStats; onUpdate: (s: PlayerStats) => void; onNameChange: (p: PlayerInfo) => void;
  onToggleSub: () => void; clockRunning: boolean; locked: boolean;
}) {
  const s = stats;
  const totalPts = pts(s);
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(s.onCourt);
  const nameEditable = !player.fromRsvp;

  const incMade = (t: string) => { if (locked) return; const n = { ...s }; if (t === "fg") { n.fgm++; n.fga++; } else if (t === "tp") { n.tpm++; n.tpa++; } else if (t === "ft") { n.ftm++; n.fta++; } onUpdate(n); };
  const incMiss = (t: string) => { if (locked) return; const n = { ...s }; if (t === "fg") n.fga++; else if (t === "tp") n.tpa++; else if (t === "ft") n.fta++; onUpdate(n); };
  const decMade = (t: string) => { if (locked) return; const n = { ...s }; if (t === "fg" && n.fgm > 0) { n.fgm--; n.fga--; } else if (t === "tp" && n.tpm > 0) { n.tpm--; n.tpa--; } else if (t === "ft" && n.ftm > 0) { n.ftm--; n.fta--; } onUpdate(n); };
  const decMiss = (t: string) => { if (locked) return; const n = { ...s }; if (t === "fg" && (n.fga - n.fgm) > 0) n.fga--; else if (t === "tp" && (n.tpa - n.tpm) > 0) n.tpa--; else if (t === "ft" && (n.fta - n.ftm) > 0) n.fta--; onUpdate(n); };
  const inc = (f: keyof PlayerStats) => { if (locked) return; const n: any = { ...s }; n[f] = (n[f] as number) + 1; onUpdate(n); };
  const dec = (f: keyof PlayerStats) => { if (locked) return; const n: any = { ...s }; if ((n[f] as number) > 0) n[f] = (n[f] as number) - 1; onUpdate(n); };

  const O = "#E87F24", G = "#4CAF50", B = "#42A5F5";
  const misses = { fg: s.fga - s.fgm, tp: s.tpa - s.tpm, ft: s.fta - s.ftm };
  const totalReb = reb(s);
  const hasStats = s.fga > 0 || s.tpa > 0 || s.fta > 0 || totalReb > 0 || s.ast > 0 || s.stl > 0 || s.blk > 0 || s.tov > 0 || s.pf > 0;

  return (
    <div style={{
      background: s.onCourt ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.015)",
      borderRadius: 14, padding: "8px 8px 7px", marginBottom: 6,
      border: s.onCourt ? "1px solid rgba(232,127,36,0.15)" : "1px solid rgba(255,255,255,0.04)",
      opacity: s.onCourt ? 1 : 0.7,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
          <button onClick={onToggleSub} disabled={locked} style={{
            width: 26, height: 26, borderRadius: 7, border: "none", cursor: locked ? "default" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            fontSize: 13, fontWeight: 900, transition: "all 0.2s",
            background: s.onCourt ? "rgba(76,175,80,0.2)" : "rgba(255,255,255,0.06)",
            color: s.onCourt ? "#4CAF50" : "rgba(255,255,255,0.3)",
            opacity: locked ? 0.5 : 1,
          }}>
            {s.onCourt ? "▼" : "▲"}
          </button>

          {editing && nameEditable ? (
            <div style={{ display: "flex", gap: 4, flex: 1, alignItems: "center" }}>
              <input type="text" value={player.num} onChange={(e) => onNameChange({ ...player, num: e.target.value })}
                style={{ width: 30, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 5, color: "#fff", padding: "2px 4px", fontSize: 12, textAlign: "center", fontFamily: "'JetBrains Mono', monospace" }} />
              <input type="text" value={player.name} onChange={(e) => onNameChange({ ...player, name: e.target.value })}
                onBlur={() => setEditing(false)} onKeyDown={(e) => e.key === "Enter" && setEditing(false)} autoFocus
                style={{ flex: 1, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 5, color: "#fff", padding: "2px 6px", fontSize: 12 }} />
            </div>
          ) : (
            <div onClick={() => !locked && nameEditable && setEditing(true)} style={{ display: "flex", alignItems: "center", gap: 5, cursor: locked || !nameEditable ? "default" : "pointer", minWidth: 0 }}>
              <span style={{ background: O, color: "#1a1a1a", fontWeight: 800, fontSize: 10, width: 24, height: 24, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>{player.num}</span>
              <span style={{ fontWeight: 600, fontSize: 12, color: "#e8e6e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{player.name}</span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: s.onCourt && clockRunning ? "#4CAF50" : "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
            {fmtMins(s.timePlayed)}
          </span>
          {hasStats && !expanded && (
            <div style={{ display: "flex", gap: 4 }}>
              {totalReb > 0 && <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{totalReb}R</span>}
              {s.ast > 0 && <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{s.ast}A</span>}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "baseline", gap: 2, minWidth: 36, justifyContent: "flex-end" }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: "#fff", fontFamily: "'JetBrains Mono', monospace", textShadow: totalPts > 0 ? "0 0 14px rgba(232,127,36,0.25)" : "none" }}>{totalPts}</span>
          </div>
          <button onClick={() => setExpanded(!expanded)} style={{
            width: 22, height: 22, borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.3)", cursor: "pointer",
            fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {expanded ? "−" : "+"}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 7, pointerEvents: locked ? "none" : "auto", opacity: locked ? 0.5 : 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
            <div style={{ display: "flex", gap: 2 }}>
              <ShootBtn label="FG" value={s.fgm} onTap={() => incMade("fg")} onHold={() => decMade("fg")} color={O} variant="made" />
              <ShootBtn label="MISS" value={misses.fg} onTap={() => incMiss("fg")} onHold={() => decMiss("fg")} color={O} variant="miss" />
            </div>
            <div style={{ display: "flex", gap: 2 }}>
              <ShootBtn label="3PT" value={s.tpm} onTap={() => incMade("tp")} onHold={() => decMade("tp")} color={G} variant="made" />
              <ShootBtn label="MISS" value={misses.tp} onTap={() => incMiss("tp")} onHold={() => decMiss("tp")} color={G} variant="miss" />
            </div>
            <div style={{ display: "flex", gap: 2 }}>
              <ShootBtn label="FT" value={s.ftm} onTap={() => incMade("ft")} onHold={() => decMade("ft")} color={B} variant="made" />
              <ShootBtn label="MISS" value={misses.ft} onTap={() => incMiss("ft")} onHold={() => decMiss("ft")} color={B} variant="miss" />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, margin: "5px 0" }}>
            {([[s.fgm, s.fga, "FG", O], [s.tpm, s.tpa, "3P", G], [s.ftm, s.fta, "FT", B]] as [number, number, string, string][]).map(([m, a, l, c]) => {
              const p = a === 0 ? 0 : (m / a) * 100;
              return (
                <div key={l} style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                    <span style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.3)" }}>{l}</span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: a > 0 ? c : "rgba(255,255,255,0.1)", fontFamily: "'JetBrains Mono', monospace" }}>{pct(m, a)}</span>
                  </div>
                  <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 2, background: c, width: `${p}%`, transition: "width 0.3s" }} />
                  </div>
                  <div style={{ fontSize: 7, color: "rgba(255,255,255,0.2)", marginTop: 1, textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>{m}/{a}</div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
            <CounterBtn label="OREB" value={s.oreb} onTap={() => inc("oreb")} onHold={() => dec("oreb")} color="#ab47bc" />
            <CounterBtn label="DREB" value={s.dreb} onTap={() => inc("dreb")} onHold={() => dec("dreb")} color="#7e57c2" />
            <CounterBtn label="AST" value={s.ast} onTap={() => inc("ast")} onHold={() => dec("ast")} color="#26c6da" />
            <CounterBtn label="STL" value={s.stl} onTap={() => inc("stl")} onHold={() => dec("stl")} color="#66bb6a" />
            <CounterBtn label="BLK" value={s.blk} onTap={() => inc("blk")} onHold={() => dec("blk")} color="#5c6bc0" />
            <CounterBtn label="TO" value={s.tov} onTap={() => inc("tov")} onHold={() => dec("tov")} color="#ef5350" />
            <CounterBtn label="PF" value={s.pf} onTap={() => inc("pf")} onHold={() => dec("pf")} color="#ff7043" warn />
          </div>
        </div>
      )}
    </div>
  );
}

function SubmitModal({ onClose, onConfirm, players, stats, teamName, oppName, teamPts, oppScore, format, period, otNumber, submitted }: {
  onClose: () => void; onConfirm: () => void; players: PlayerInfo[]; stats: Record<string, PlayerStats>;
  teamName: string; oppName: string; teamPts: number; oppScore: number; format: string; period: number; otNumber: number; submitted: boolean;
}) {
  const scoreDiff = teamPts - oppScore;
  const result = scoreDiff > 0 ? "WIN" : scoreDiff < 0 ? "LOSS" : "DRAW";
  const resultColor = scoreDiff > 0 ? "#4CAF50" : scoreDiff < 0 ? "#ef5350" : "rgba(255,255,255,0.4)";
  const O = "#E87F24";

  const finalLabel = otNumber > 0 ? `FINAL / ${otLabel(otNumber)}` : "FINAL";
  const sortedPlayers = [...players].sort((a, b) => pts(stats[b.id] || initStats()) - pts(stats[a.id] || initStats()));

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      backdropFilter: "blur(4px)",
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: 500, maxHeight: "92vh", overflow: "auto",
        background: "#1a1a1a", borderTopLeftRadius: 20, borderTopRightRadius: 20,
        border: "1px solid rgba(255,255,255,0.08)", borderBottom: "none",
        padding: "16px 14px 20px",
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", margin: "0 auto 14px" }} />

        {submitted ? (
          <div style={{ textAlign: "center", padding: "30px 20px" }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%", background: "rgba(76,175,80,0.15)",
              border: "2px solid #4CAF50", display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px", fontSize: 32, color: "#4CAF50",
            }}>✓</div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#fff" }}>Submitted for Review</h2>
            <p style={{ margin: "8px 0 24px", color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
              Game stats sent to coaching staff.
            </p>
            <button onClick={onClose} style={{
              padding: "10px 28px", borderRadius: 10, fontSize: 12, fontWeight: 700,
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              color: "#fff", cursor: "pointer", letterSpacing: 0.5,
            }}>CLOSE</button>
          </div>
        ) : (
          <>
            <div style={{ textAlign: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.4)", letterSpacing: 1.5, marginBottom: 4 }}>
                GAME SUMMARY · {finalLabel}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: O, letterSpacing: 0.8, textTransform: "uppercase" }}>{teamName}</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: "#fff", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{teamPts}</div>
                </div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.2)" }}>vs</div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.45)", letterSpacing: 0.8, textTransform: "uppercase" }}>{oppName}</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: "rgba(255,255,255,0.7)", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{oppScore}</div>
                </div>
              </div>
              <div style={{ marginTop: 6, fontSize: 13, fontWeight: 900, color: resultColor, letterSpacing: 1.5 }}>
                {result} {scoreDiff !== 0 && `(${scoreDiff > 0 ? "+" : ""}${scoreDiff})`}
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.025)", borderRadius: 10, padding: "8px 4px", marginBottom: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr repeat(6, 1fr)", gap: 4, padding: "0 8px 6px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: 0.3 }}>PLAYER</span>
                {["MIN", "PTS", "REB", "AST", "FG%", "3P%"].map((l) => (
                  <span key={l} style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.4)", textAlign: "center", letterSpacing: 0.3 }}>{l}</span>
                ))}
              </div>
              {sortedPlayers.map((p) => {
                const s = stats[p.id] || initStats();
                const hasMinutes = s.timePlayed > 0;
                if (!hasMinutes && pts(s) === 0 && reb(s) === 0 && s.ast === 0) return null;
                return (
                  <div key={p.id} style={{ display: "grid", gridTemplateColumns: "2fr repeat(6, 1fr)", gap: 4, padding: "5px 8px", alignItems: "center", fontFamily: "'JetBrains Mono', monospace" }}>
                    <span style={{ fontSize: 11, color: "#e8e6e1", fontWeight: 600, fontFamily: "'Outfit', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <span style={{ color: O, fontWeight: 800, marginRight: 4, fontFamily: "'JetBrains Mono', monospace" }}>#{p.num}</span>{p.name}
                    </span>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", textAlign: "center" }}>{fmtMins(s.timePlayed)}</span>
                    <span style={{ fontSize: 12, color: "#fff", textAlign: "center", fontWeight: 700 }}>{pts(s)}</span>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", textAlign: "center" }}>{reb(s)}</span>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", textAlign: "center" }}>{s.ast}</span>
                    <span style={{ fontSize: 11, color: s.fga > 0 ? O : "rgba(255,255,255,0.2)", textAlign: "center" }}>{pct(s.fgm, s.fga)}</span>
                    <span style={{ fontSize: 11, color: s.tpa > 0 ? "#4CAF50" : "rgba(255,255,255,0.2)", textAlign: "center" }}>{pct(s.tpm, s.tpa)}</span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={onClose} style={{
                flex: 1, padding: "12px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.7)", cursor: "pointer", letterSpacing: 0.5,
              }}>CANCEL</button>
              <button onClick={onConfirm} style={{
                flex: 2, padding: "12px", borderRadius: 10, fontSize: 12, fontWeight: 800,
                background: "linear-gradient(135deg, #E87F24 0%, #c06a15 100%)", border: "none",
                color: "#fff", cursor: "pointer", letterSpacing: 0.8,
                boxShadow: "0 4px 16px rgba(232,127,36,0.25)",
              }}>CONFIRM & SUBMIT</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function GameScoring() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const urlParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const eventId = urlParams.get("eventId");
  const sessionId = urlParams.get("sessionId");

  const { data: event } = useQuery<any>({
    queryKey: ["/api/events", eventId],
    enabled: !!eventId,
  });

  const { data: existingSession, isLoading: sessionLoading } = useQuery<any>({
    queryKey: sessionId 
      ? ["/api/game-sessions", sessionId]
      : ["/api/game-sessions/event", eventId],
    enabled: !!eventId || !!sessionId,
  });

  const { data: roster = [], isLoading: rosterLoading } = useQuery<any[]>({
    queryKey: ["/api/game-sessions/roster", eventId],
    enabled: !!eventId,
  });

  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [stats, setStats] = useState<Record<string, PlayerStats>>({});
  const [teamName, setTeamName] = useState("TEAM");
  const [editingTeam, setEditingTeam] = useState(false);
  const [oppName, setOppName] = useState("OPP");
  const [editingOpp, setEditingOpp] = useState(false);
  const [oppScore, setOppScore] = useState(0);
  const nextId = useRef(1000);

  const [format, setFormat] = useState("quarters");
  const [periodTime, setPeriodTime] = useState(10 * 60);
  const [otTime, setOtTime] = useState(5 * 60);
  const [clock, setClock] = useState(10 * 60);
  const [running, setRunning] = useState(false);
  const [period, setPeriod] = useState(1);
  const [otNumber, setOtNumber] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [approved, setApproved] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const { user: currentUser } = useAuth();
  const isCoachOrAdmin = currentUser?.role === 'coach' || currentUser?.role === 'admin';
  // Task #263: gate stats entry behind the shared player-access guard. Coach,
  // admin, and parent users always pass through; only a player whose
  // enrollment is grace/expired/none is paywalled.
  const { access: scoringAccess, bypass: scoringBypass } = usePlayerAccess();
  const scoringBlocked = !scoringBypass && !!scoringAccess && !scoringAccess.canAccess;
  const sessionResp = existingSession as { session?: { id?: number; status?: string; scoredByUserId?: string | null }; canReview?: boolean; canSubmit?: boolean; submitBlockReason?: string | null } | null | undefined;
  const sessionMeta = sessionResp?.session;
  const sessionScorerId: string | null = sessionMeta?.scoredByUserId ?? null;
  const sessionStatus: string | null = sessionMeta?.status ?? null;
  const existingSessionId: number | null = sessionMeta?.id ?? null;
  const reviewModeRequested = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('review') === '1';
  // Server determines who is an authorized reviewer (invited coach/admin).
  const canReview = !!sessionResp?.canReview && sessionStatus === 'submitted';
  const reviewMode = canReview && reviewModeRequested;
  const isOriginalScorerOrNew = !sessionScorerId || currentUser?.id === sessionScorerId;
  // Server-computed eligibility for the current user. Defaults to true while
  // the session response is still loading so we don't flash the blocked UI.
  const canSubmit = sessionResp ? (sessionResp.canSubmit !== false) : true;
  const submitBlockReason: string | null = sessionResp?.submitBlockReason ?? null;
  // Admins and coaches can take over a scoresheet that was started by someone
  // else (e.g. to fix or finish stats), matching the backend rule. Parents are
  // still bound to the session they originally started.
  const canEditAsScorer = isOriginalScorerOrNew || isCoachOrAdmin;
  // Editable when: not approved, not in review mode, and either no submission yet or current user is the (effective) scorer.
  const locked = approved || reviewMode || (sessionStatus === 'submitted' && !canEditAsScorer);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (initialized) return;
    if (sessionLoading || rosterLoading) return;

    if (existingSession?.session) {
      setOppName(existingSession.session.opponentName || "OPP");
      setOppScore(existingSession.session.opponentScore || 0);
      setFormat(existingSession.session.gameFormat || "quarters");
      setPeriodTime(existingSession.session.periodLength || 600);
      setOtTime(existingSession.session.otLength || 300);
      setClock(existingSession.session.periodLength || 600);
      if (existingSession.session.status === "submitted") {
        setSubmitted(true);
      }
      if (existingSession.session.status === "approved") {
        setSubmitted(true);
        setApproved(true);
        setGameOver(true);
      }
      if (existingSession.playerStats?.length > 0) {
        const ps: PlayerInfo[] = existingSession.playerStats.map((s: any) => ({
          id: s.playerId, name: s.playerName || "Player", num: s.jerseyNumber || "0",
          fromRsvp: !(typeof s.playerId === "string" && (s.playerId.startsWith("added-") || s.playerId.startsWith("default-"))),
        }));
        setPlayers(ps);
        const statsMap: Record<string, PlayerStats> = {};
        existingSession.playerStats.forEach((s: any, i: number) => {
          statsMap[s.playerId] = {
            fgm: s.fgm || 0, fga: s.fga || 0, tpm: s.tpm || 0, tpa: s.tpa || 0,
            ftm: s.ftm || 0, fta: s.fta || 0, oreb: s.oreb || 0, dreb: s.dreb || 0,
            ast: s.ast || 0, stl: s.stl || 0, blk: s.blk || 0, tov: s.tov || 0,
            pf: s.pf || 0, timePlayed: s.timePlayed || 0, onCourt: i < 5,
          };
        });
        setStats(statsMap);
        setInitialized(true);
        return;
      }
    }

    if (roster.length > 0) {
      const ps: PlayerInfo[] = roster.map((r: any) => ({
        id: r.id, name: `${r.firstName || ""} ${r.lastName || ""}`.trim() || "Player", num: r.jerseyNumber?.toString() || "0",
        fromRsvp: true,
      }));
      setPlayers(ps);
      const statsMap: Record<string, PlayerStats> = {};
      ps.forEach((p, i) => { statsMap[p.id] = { ...initStats(), onCourt: i < 5 }; });
      setStats(statsMap);
      setInitialized(true);
    } else if (eventId) {
      setPlayers([]);
      setStats({});
      setInitialized(true);
    }
  }, [roster, existingSession, initialized, eventId, sessionLoading, rosterLoading]);

  useEffect(() => {
    if (event?.opponentTeam) setOppName(event.opponentTeam);
    if (event?.teamId) {
      const fetchTeamName = async () => {
        try {
          const token = localStorage.getItem('authToken');
          const headers: Record<string, string> = {};
          if (token) headers['Authorization'] = `Bearer ${token}`;
          const res = await fetch(`/api/teams/${event.teamId}`, { credentials: 'include', headers });
          if (res.ok) {
            const team = await res.json();
            if (team?.name) setTeamName(team.name.toUpperCase());
          }
        } catch {}
      };
      fetchTeamName();
    }
  }, [event]);

  const maxPeriods = format === "quarters" ? 4 : 2;
  const inOT = otNumber > 0;
  const isLastRegulationPeriod = period >= maxPeriods && !inOT;
  const atPeriodEnd = clock === 0 && !gameOver;

  useEffect(() => {
    if (running && !gameOver && !locked) {
      intervalRef.current = setInterval(() => {
        setClock((prev) => {
          if (prev <= 1) { setRunning(false); return 0; }
          return prev - 1;
        });
        setStats((prev) => {
          const next = { ...prev };
          Object.keys(next).forEach((id) => {
            if (next[id].onCourt) next[id] = { ...next[id], timePlayed: next[id].timePlayed + 1 };
          });
          return next;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, gameOver, locked]);

  const toggleClock = () => {
    if (gameOver || locked || atPeriodEnd) return;
    setRunning((r) => !r);
  };

  const advancePeriod = () => {
    if (isLastRegulationPeriod) return;
    if (inOT) return;
    setPeriod((p) => p + 1);
    setClock(periodTime);
    setRunning(false);
  };

  const startOT = () => {
    setOtNumber((n) => n + 1);
    setClock(otTime);
    setRunning(false);
    setGameOver(false);
  };

  const endGame = () => {
    setGameOver(true);
    setRunning(false);
  };

  const changePeriodTime = (mins: number) => {
    const t = Math.max(1, Math.min(30, mins)) * 60;
    setPeriodTime(t);
    if (!running && !inOT && period === 1) setClock(t);
  };

  const changeFormat = (f: string) => {
    setFormat(f);
    setPeriod(1);
    setOtNumber(0);
    setRunning(false);
    setGameOver(false);
    setClock(periodTime);
  };

  const updateStat = (id: string, s: PlayerStats) => setStats((prev) => ({ ...prev, [id]: s }));
  const updatePlayer = (id: string, p: PlayerInfo) => setPlayers((prev) => prev.map((pl) => (pl.id === id ? p : pl)));
  const toggleSub = (id: string) => setStats((prev) => ({ ...prev, [id]: { ...prev[id], onCourt: !prev[id].onCourt } }));

  const addPlayer = () => {
    const id = `added-${nextId.current++}`;
    const num = String(players.length + 1);
    setPlayers([...players, { id, name: `Player ${num}`, num }]);
    setStats((prev) => ({ ...prev, [id]: initStats() }));
  };

  const resetAll = () => {
    const m: Record<string, PlayerStats> = {};
    players.forEach((p, i) => { m[p.id] = { ...initStats(), onCourt: i < 5 }; });
    setStats(m);
    setOppScore(0);
    setPeriod(1);
    setOtNumber(0);
    setClock(periodTime);
    setRunning(false);
    setGameOver(false);
    setSubmitted(false);
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const teamPts = players.reduce((sum, p) => sum + pts(stats[p.id] || initStats()), 0);
      const payload = {
        eventId: Number(eventId),
        teamId: event?.teamId || null,
        opponentName: oppName,
        teamScore: teamPts,
        opponentScore: oppScore,
        gameFormat: format,
        periodLength: periodTime,
        otLength: otTime,
        finalPeriod: period,
        otCount: otNumber,
        playerStats: players.map((p) => {
          const s = stats[p.id] || initStats();
          return {
            playerId: p.id,
            playerName: p.name,
            jerseyNumber: p.num,
            fgm: s.fgm, fga: s.fga, tpm: s.tpm, tpa: s.tpa,
            ftm: s.ftm, fta: s.fta, oreb: s.oreb, dreb: s.dreb,
            ast: s.ast, stl: s.stl, blk: s.blk, tov: s.tov,
            pf: s.pf, timePlayed: s.timePlayed,
          };
        }),
      };
      const res = await apiRequest("POST", "/api/game-sessions", payload);
      return res;
    },
    onSuccess: () => {
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["/api/game-sessions"] });
      toast({ title: "Game stats submitted", description: "Stats sent for review." });
    },
    onError: (err: any) => {
      toast({ title: "Couldn\u2019t submit stats", description: parseApiError(err, "Failed to submit"), variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    submitMutation.mutate();
  };

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!existingSessionId) throw new Error("No game session to approve");
      return await apiRequest("PATCH", `/api/game-sessions/${existingSessionId}/approve`, {});
    },
    onSuccess: () => {
      setApproved(true);
      setSubmitted(true);
      setGameOver(true);
      queryClient.invalidateQueries({ queryKey: ["/api/game-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/game-sessions/event", eventId] });
      toast({ title: "Approved", description: "Game stats are locked and live." });
    },
    onError: (err: any) => {
      toast({ title: "Couldn\u2019t approve", description: parseApiError(err, "Failed to approve"), variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!existingSessionId) throw new Error("No game session to reject");
      return await apiRequest("PATCH", `/api/game-sessions/${existingSessionId}/reject`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/game-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/game-sessions/event", eventId] });
      toast({ title: "Sent back", description: "Stats sent back to the scorer for edits." });
      setLocation("/admin?tab=events");
    },
    onError: (err: any) => {
      toast({ title: "Couldn\u2019t reject", description: parseApiError(err, "Failed to reject"), variant: "destructive" });
    },
  });

  const teamPts = players.reduce((sum, p) => sum + pts(stats[p.id] || initStats()), 0);
  const team = players.reduce((acc, p) => {
    const s = stats[p.id] || initStats();
    (["fgm", "fga", "tpm", "tpa", "ftm", "fta", "oreb", "dreb", "ast", "stl", "blk", "tov", "pf", "timePlayed"] as (keyof PlayerStats)[]).forEach((k) => ((acc as any)[k] += s[k]));
    return acc;
  }, { fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, tov: 0, pf: 0, timePlayed: 0 });

  const teamReb = team.oreb + team.dreb;
  const scoreDiff = teamPts - oppScore;
  const resultText = scoreDiff > 0 ? "WIN" : scoreDiff < 0 ? "LOSS" : "DRAW";
  const resultColor = scoreDiff > 0 ? "#4CAF50" : scoreDiff < 0 ? "#ef5350" : "rgba(255,255,255,0.4)";
  const O = "#E87F24", G = "#4CAF50", B = "#42A5F5";

  const onCourt = players.filter((p) => stats[p.id]?.onCourt);
  const bench = players.filter((p) => !stats[p.id]?.onCourt);

  const oppH = useHold(
    () => { if (!locked) setOppScore((s) => s + 1); },
    () => { if (!locked) setOppScore((s) => Math.max(0, s - 1)); }
  );

  const periodLabel = inOT ? otLabel(otNumber) : format === "quarters" ? `Q${period}` : `H${period}`;

  if (!eventId) {
    return (
      <div style={{ background: "#111", color: "#fff", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: 16 }}>No event selected for scoring.</p>
          <button onClick={() => setLocation("/admin")} style={{ padding: "10px 24px", borderRadius: 10, background: O, color: "#fff", border: "none", fontWeight: 700, cursor: "pointer" }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (scoringBlocked && scoringAccess) {
    return <AccessPaywall access={scoringAccess} feature="Stats entry" />;
  }

  return (
    <div style={{
      background: "#111", color: "#e8e6e1", minHeight: "100vh", maxWidth: 500,
      margin: "0 auto", fontFamily: "'Outfit', sans-serif", paddingBottom: 24,
      overflowX: "hidden",
    }}>
      <div style={{
        position: "sticky", top: 0, zIndex: 50, background: "#111",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "calc(env(safe-area-inset-top, 0px) + 14px) 10px 8px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => {
              if (locked || (!running && teamPts === 0 && oppScore === 0)) {
                setLocation("/admin?tab=events");
              } else if (window.confirm("Leave scoring? Unsaved stats will be lost.")) {
                setLocation("/admin?tab=events");
              }
            }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", padding: 4 }}>
              <ArrowLeft size={18} />
            </button>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{event?.title || "Game"}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>
                {event?.startTime ? new Date(event.startTime).toLocaleDateString() : ""}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 2, background: "rgba(255,255,255,0.04)", borderRadius: 6, padding: 2 }}>
              {["quarters", "halves"].map((f) => (
                <button key={f} onClick={() => !locked && changeFormat(f)} style={{
                  padding: "3px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, border: "none",
                  background: format === f ? O : "transparent", color: format === f ? "#fff" : "rgba(255,255,255,0.35)",
                  cursor: locked ? "default" : "pointer", letterSpacing: 0.3, textTransform: "uppercase",
                }}>{f === "quarters" ? "4Q" : "2H"}</button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <button onClick={() => !locked && changePeriodTime(periodTime / 60 - 1)} disabled={locked} style={{
                width: 20, height: 20, borderRadius: 5, border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.3)", cursor: locked ? "default" : "pointer",
                fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center",
              }}>−</button>
              <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", minWidth: 24, textAlign: "center", fontFamily: "'JetBrains Mono', monospace" }}>{periodTime / 60}m</span>
              <button onClick={() => !locked && changePeriodTime(periodTime / 60 + 1)} disabled={locked} style={{
                width: 20, height: 20, borderRadius: 5, border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.3)", cursor: locked ? "default" : "pointer",
                fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center",
              }}>+</button>
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: inOT ? "#ffd54f" : "rgba(255,255,255,0.3)", letterSpacing: 1.5 }}>
            {gameOver ? (approved ? "✓ APPROVED" : submitted ? "✓ SUBMITTED" : "FINAL") : periodLabel}
          </div>
          <button onClick={toggleClock} disabled={gameOver || locked || atPeriodEnd} style={{
            fontSize: 48, fontWeight: 900, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1,
            color: running ? "#4CAF50" : (gameOver ? "rgba(255,255,255,0.2)" : "#fff"),
            background: "none", border: "none", cursor: gameOver || locked ? "default" : "pointer",
            transition: "color 0.2s", letterSpacing: 2,
            textShadow: running ? "0 0 20px rgba(76,175,80,0.3)" : inOT && !gameOver ? "0 0 20px rgba(255,213,79,0.25)" : "none",
          }}>
            {fmtTime(clock)}
          </button>

          {atPeriodEnd && (
            <div style={{ marginTop: 6, display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
              {inOT ? (
                <>
                  <button onClick={endGame} style={{
                    padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                    background: scoreDiff === 0 ? "rgba(255,255,255,0.04)" : "rgba(232,127,36,0.15)",
                    border: scoreDiff === 0 ? "1.5px solid rgba(255,255,255,0.1)" : "1.5px solid rgba(232,127,36,0.4)",
                    color: scoreDiff === 0 ? "rgba(255,255,255,0.5)" : O, cursor: "pointer", letterSpacing: 0.5,
                  }}>END GAME</button>
                  <button onClick={startOT} style={{
                    padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 800,
                    background: "rgba(255,213,79,0.15)", border: "1.5px solid rgba(255,213,79,0.4)",
                    color: "#ffd54f", cursor: "pointer", letterSpacing: 0.5,
                  }}>▶ {otLabel(otNumber + 1)}</button>
                </>
              ) : isLastRegulationPeriod ? (
                <>
                  <button onClick={endGame} style={{
                    padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                    background: "rgba(232,127,36,0.15)", border: "1.5px solid rgba(232,127,36,0.4)",
                    color: O, cursor: "pointer", letterSpacing: 0.5,
                  }}>END GAME</button>
                  <button onClick={startOT} style={{
                    padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 800,
                    background: "rgba(255,213,79,0.15)", border: "1.5px solid rgba(255,213,79,0.4)",
                    color: "#ffd54f", cursor: "pointer", letterSpacing: 0.5,
                  }}>▶ OT</button>
                </>
              ) : (
                <button onClick={advancePeriod} style={{
                  padding: "6px 20px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                  background: "rgba(232,127,36,0.15)", border: "1.5px solid rgba(232,127,36,0.4)",
                  color: O, cursor: "pointer", letterSpacing: 0.5,
                }}>
                  START {format === "quarters" ? `Q${period + 1}` : `H${period + 1}`}
                </button>
              )}
            </div>
          )}

          {gameOver && !locked && (
            <div style={{ marginTop: 8, display: "flex", gap: 6, justifyContent: "center" }}>
              <button onClick={startOT} style={{
                padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 800,
                background: "rgba(255,213,79,0.12)", border: "1.5px solid rgba(255,213,79,0.35)",
                color: "#ffd54f", cursor: "pointer", letterSpacing: 0.5,
              }}>↻ GO TO {otLabel(otNumber + 1)}</button>
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0 }}>
          <div style={{ flex: 1, textAlign: "center" }}>
            {editingTeam ? (
              <input value={teamName} onChange={(e) => setTeamName(e.target.value)}
                onBlur={() => setEditingTeam(false)} onKeyDown={(e) => e.key === "Enter" && setEditingTeam(false)} autoFocus
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, color: "#fff", padding: "2px 8px", fontSize: 12, fontWeight: 700, textAlign: "center", width: 90 }} />
            ) : (
              <div onClick={() => !locked && setEditingTeam(true)} style={{ fontSize: 11, fontWeight: 800, color: O, letterSpacing: 1, cursor: locked ? "default" : "pointer", textTransform: "uppercase" }}>{teamName}</div>
            )}
            <div style={{ fontSize: 44, fontWeight: 900, color: "#fff", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.1 }}>{teamPts}</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 10px" }}>
            <span style={{ fontSize: 16, color: "rgba(255,255,255,0.15)", fontWeight: 300 }}>vs</span>
            {gameOver && resultText && (
              <span style={{ fontSize: 12, fontWeight: 900, color: resultColor, letterSpacing: 1, marginTop: 2 }}>{resultText}</span>
            )}
            {!gameOver && scoreDiff !== 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, color: resultColor, fontFamily: "'JetBrains Mono', monospace", marginTop: 1 }}>
                {scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff}
              </span>
            )}
          </div>

          <div style={{ flex: 1, textAlign: "center" }}>
            {editingOpp ? (
              <input value={oppName} onChange={(e) => setOppName(e.target.value)}
                onBlur={() => setEditingOpp(false)} onKeyDown={(e) => e.key === "Enter" && setEditingOpp(false)} autoFocus
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, color: "#fff", padding: "2px 8px", fontSize: 12, fontWeight: 700, textAlign: "center", width: 90 }} />
            ) : (
              <div onClick={() => !locked && setEditingOpp(true)} style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.45)", letterSpacing: 1, cursor: locked ? "default" : "pointer", textTransform: "uppercase" }}>{oppName}</div>
            )}
            <button {...oppH} disabled={locked} style={{
              fontSize: 44, fontWeight: 900, color: "rgba(255,255,255,0.7)", fontFamily: "'JetBrains Mono', monospace",
              lineHeight: 1.1, background: "none", border: "none", cursor: locked ? "default" : "pointer", width: "100%",
              userSelect: "none", WebkitUserSelect: "none" as any, touchAction: "manipulation",
              opacity: locked ? 0.6 : 1,
            }}>{oppScore}</button>
            <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", marginTop: -2 }}>tap +1 · hold −1</div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          {[
            { v: teamReb, l: "REB" }, { v: team.ast, l: "AST" },
            { v: team.stl, l: "STL" }, { v: team.blk, l: "BLK" }, { v: team.tov, l: "TO" },
          ].map((x) => (
            <div key={x.l} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "rgba(255,255,255,0.6)", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{x.v}</div>
              <div style={{ fontSize: 7, color: "rgba(255,255,255,0.2)", fontWeight: 700, letterSpacing: 0.4 }}>{x.l}</div>
            </div>
          ))}
        </div>
      </div>

      {onCourt.length > 0 && (
        <div style={{ padding: "0 6px" }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: "#4CAF50", letterSpacing: 1.5, padding: "8px 4px 4px", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: "#4CAF50", display: "inline-block" }} />
            ON COURT ({onCourt.length})
          </div>
          {onCourt.map((p) => (
            <PlayerRow key={p.id} player={p} stats={stats[p.id] || initStats()}
              onUpdate={(s) => updateStat(p.id, s)} onNameChange={(u) => updatePlayer(p.id, u)}
              onToggleSub={() => toggleSub(p.id)} clockRunning={running} locked={locked} />
          ))}
        </div>
      )}

      {bench.length > 0 && (
        <div style={{ padding: "0 6px" }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.25)", letterSpacing: 1.5, padding: "6px 4px 4px", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.15)", display: "inline-block" }} />
            BENCH ({bench.length})
          </div>
          {bench.map((p) => (
            <PlayerRow key={p.id} player={p} stats={stats[p.id] || initStats()}
              onUpdate={(s) => updateStat(p.id, s)} onNameChange={(u) => updatePlayer(p.id, u)}
              onToggleSub={() => toggleSub(p.id)} clockRunning={running} locked={locked} />
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 6, padding: "8px 6px" }}>
        <button onClick={addPlayer} disabled={locked} style={{
          flex: 1, padding: "10px", borderRadius: 10,
          background: "rgba(232,127,36,0.1)", border: "1px dashed rgba(232,127,36,0.3)",
          color: O, fontWeight: 700, fontSize: 12, cursor: locked ? "default" : "pointer",
          opacity: locked ? 0.4 : 1,
        }}>+ ADD PLAYER</button>
        <button onClick={resetAll} disabled={locked} style={{
          padding: "10px 16px", borderRadius: 10,
          background: "rgba(255,60,60,0.07)", border: "1px solid rgba(255,60,60,0.18)",
          color: "#ff4444", fontWeight: 700, fontSize: 12, cursor: locked ? "default" : "pointer",
          opacity: locked ? 0.4 : 1,
        }}>RESET</button>
      </div>

      <div style={{ padding: "2px 6px 8px" }}>
        {reviewMode ? (
          <div style={{ width: "100%", display: "flex", gap: 8 }}>
            <button onClick={() => rejectMutation.mutate()} disabled={rejectMutation.isPending || approveMutation.isPending} style={{
              flex: 1, padding: "14px", borderRadius: 12, fontSize: 13, fontWeight: 800,
              background: "rgba(244,67,54,0.1)", border: "1.5px solid rgba(244,67,54,0.35)",
              color: "#f44336", cursor: "pointer", letterSpacing: 1, textTransform: "uppercase",
            }} data-testid="button-reject-stats">
              {rejectMutation.isPending ? "Rejecting..." : "Reject"}
            </button>
            <button onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending || rejectMutation.isPending} style={{
              flex: 1, padding: "14px", borderRadius: 12, fontSize: 13, fontWeight: 800,
              background: "linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)", border: "none",
              color: "#fff", cursor: "pointer", letterSpacing: 1, textTransform: "uppercase",
              boxShadow: "0 4px 20px rgba(76,175,80,0.25)",
            }} data-testid="button-approve-stats">
              {approveMutation.isPending ? "Approving..." : "Approve & Lock"}
            </button>
          </div>
        ) : !canSubmit && !approved ? (
          <div style={{
            width: "100%", padding: "14px", borderRadius: 12, fontSize: 12, fontWeight: 600,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.7)", textAlign: "center", lineHeight: 1.4,
          }} data-testid="text-submit-blocked">
            {submitBlockReason || "You can’t submit stats for this game."}
          </div>
        ) : (
          <button onClick={() => setShowSubmit(true)} disabled={locked || submitMutation.isPending} style={{
            width: "100%", padding: "14px", borderRadius: 12, fontSize: 13, fontWeight: 800,
            background: approved
              ? "rgba(76,175,80,0.18)"
              : submitted
                ? "rgba(255,193,7,0.12)"
                : gameOver ? "linear-gradient(135deg, #E87F24 0%, #c06a15 100%)" : "rgba(232,127,36,0.08)",
            border: approved
              ? "1px solid rgba(76,175,80,0.4)"
              : submitted
                ? "1px solid rgba(255,193,7,0.4)"
                : gameOver ? "none" : "1.5px solid rgba(232,127,36,0.25)",
            color: approved ? "#4CAF50" : submitted ? "#FFC107" : gameOver ? "#fff" : O,
            cursor: approved ? "default" : "pointer",
            letterSpacing: 1, textTransform: "uppercase",
            boxShadow: gameOver && !submitted && !approved ? "0 4px 20px rgba(232,127,36,0.25)" : "none",
            transition: "all 0.2s",
          }} data-testid="button-submit-stats">
            {approved
              ? "✓ APPROVED & LOCKED"
              : submitMutation.isPending
                ? "SUBMITTING..."
                : submitted
                  ? "✓ Submitted — Update & Resubmit"
                  : "Submit for Review"}
          </button>
        )}
      </div>

      <div style={{
        margin: "2px 6px 0", background: "rgba(232,127,36,0.05)",
        border: "1px solid rgba(232,127,36,0.12)", borderRadius: 14, padding: "12px 12px 10px",
      }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.3)", letterSpacing: 1.5, marginBottom: 8 }}>TEAM TOTALS</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            { label: "FG", made: team.fgm, att: team.fga, color: O },
            { label: "3PT", made: team.tpm, att: team.tpa, color: G },
            { label: "FT", made: team.ftm, att: team.fta, color: B },
          ].map((c) => {
            const p = c.att === 0 ? 0 : (c.made / c.att) * 100;
            return (
              <div key={c.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: c.att > 0 ? c.color : "rgba(255,255,255,0.1)", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{pct(c.made, c.att)}</div>
                <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", margin: "4px auto 3px", width: "80%", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 2, background: c.color, width: `${p}%`, transition: "width 0.3s" }} />
                </div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{c.label} {c.made}/{c.att}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>2PT: <span style={{ color: O, fontWeight: 700 }}>{team.fgm * 2}</span></span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>3PT: <span style={{ color: G, fontWeight: 700 }}>{team.tpm * 3}</span></span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>FT: <span style={{ color: B, fontWeight: 700 }}>{team.ftm}</span></span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          {[
            { l: "OREB", v: team.oreb, c: "#ab47bc" }, { l: "DREB", v: team.dreb, c: "#7e57c2" },
            { l: "AST", v: team.ast, c: "#26c6da" }, { l: "STL", v: team.stl, c: "#66bb6a" },
            { l: "BLK", v: team.blk, c: "#5c6bc0" }, { l: "TO", v: team.tov, c: "#ef5350" },
            { l: "PF", v: team.pf, c: "#ff7043" },
          ].map((x) => (
            <div key={x.l} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: x.v > 0 ? "#fff" : "rgba(255,255,255,0.1)", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{x.v}</div>
              <div style={{ fontSize: 7, color: x.v > 0 ? x.c : "rgba(255,255,255,0.15)", fontWeight: 700, marginTop: 1 }}>{x.l}</div>
            </div>
          ))}
        </div>
      </div>

      {showSubmit && (
        <SubmitModal
          onClose={() => setShowSubmit(false)}
          onConfirm={handleSubmit}
          players={players} stats={stats}
          teamName={teamName} oppName={oppName}
          teamPts={teamPts} oppScore={oppScore}
          format={format} period={period} otNumber={otNumber}
          submitted={submitted}
        />
      )}
    </div>
  );
}
