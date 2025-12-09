import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Trophy, Award } from "lucide-react";

interface AwardDefinition {
  id: number;
  name: string;
  tier: string;
  description: string | null;
  imageUrl: string | null;
  triggerCategory: string;
  active: boolean;
}

/* =================== Awards =================== */
// Fallback hardcoded awards (used when database awards unavailable)
export const TEAM_TROPHIES = [
  { id: "mvp-season", name: "Season MVP", kind: "trophy" as const, description: "Most Valuable Player for the entire season" },
  { id: "coach-choice", name: "Coach's Award", kind: "trophy" as const, description: "Special recognition for exceptional character and dedication" },
  { id: "most-improved", name: "Most Improved", kind: "trophy" as const, description: "Greatest improvement over the season" },
  { id: "defensive-player", name: "Defensive Player", kind: "trophy" as const, description: "Greatest defensive impact" },
];

export const COACH_AWARDS = [
  { id: "game-mvp", name: "Game MVP", kind: "badge" as const, description: "Top performer in a game" },
  { id: "hustle-award", name: "Hustle Award", kind: "badge" as const, description: "Relentless hustle and effort" },
  { id: "teammate-award", name: "Teammate Award", kind: "badge" as const, description: "Uplifts & supports teammates" },
  { id: "student-of-the-game", name: "Student of the Game", kind: "badge" as const, description: "Preparation & basketball IQ" },
  { id: "recruiter", name: "Recruiter", kind: "badge" as const, description: "Referred a new player who joined" },
];

/* =================== Skills Schema =================== */
export const SKILL_CATEGORIES = [
  { name: "SHOOTING", skills: ["LAYUP", "2PT RANGE", "3PT RANGE"] },
  { name: "DRIBBLING", skills: ["LEFT", "RIGHT", "CONTROL", "SPEED"] },
  { name: "PASSING", skills: ["BOUNCE", "CHEST", "OVERHEAD", "CATCHING"] },
  { name: "DEFENSE", skills: ["TALKING", "STANCE", "CLOSEOUT"] },
  { name: "REBOUNDING", skills: ["BOX OUT", "BALL PROTECTION", "ANTICIPATION"] },
  { name: "ATHLETIC ABILITY", skills: ["STAMINA", "QUICKNESS", "COORDINATION"] },
  { name: "COACHABILITY", skills: ["ATTITUDE", "FOCUS", "WORK ETHIC", "ACCEPTS CRITICISM"] },
] as const;

export type SkillCategoryName = typeof SKILL_CATEGORIES[number]["name"];
export type EvalScores = {
  [C in SkillCategoryName]?: { [subSkill: string]: number }; // 1–5
};
export type Quarter = "Q1" | "Q2" | "Q3" | "Q4";

export interface PlayerLite {
  id: string;
  firstName: string;
  lastName: string;
  teamName?: string | null;
  profileImageUrl?: string | null;
}

/* ---------- Awards Dialog (Team Trophies & Coach Awards) ---------- */
export function AwardsDialog({
  open,
  onOpenChange,
  player,
  onGive,
  giving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  player: PlayerLite | null;
  onGive: (awardId: string | number, kind: "badge" | "trophy") => void;
  giving: boolean;
}) {
  const [tab, setTab] = useState<"trophies" | "badges">("trophies");
  
  // Fetch manual award definitions from database
  const { data: awardDefinitions = [] } = useQuery<AwardDefinition[]>({
    queryKey: ["/api/award-definitions"],
    enabled: open,
  });

  // Filter for manual awards (coach-assignable) that are active
  const manualAwards = awardDefinitions.filter(
    (a) => a.triggerCategory === "manual" && a.active
  );

  // Separate by tier: Gold/Purple/Special = trophies, others = badges
  const trophyTiers = ["Gold", "Purple", "Special"];
  const trophies = manualAwards.filter((a) => trophyTiers.includes(a.tier));
  const badges = manualAwards.filter((a) => !trophyTiers.includes(a.tier));

  const displayList = tab === "trophies" ? trophies : badges;
  const hasTrophies = trophies.length > 0;
  const hasBadges = badges.length > 0;

  // Fallback to hardcoded if no DB awards
  const useFallback = manualAwards.length === 0;
  const fallbackList = tab === "trophies" ? TEAM_TROPHIES : COACH_AWARDS;

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "Gold": return "bg-yellow-100 text-yellow-700";
      case "Purple": return "bg-purple-100 text-purple-700";
      case "Special": return "bg-gradient-to-r from-purple-100 to-yellow-100 text-purple-700";
      case "Blue": return "bg-blue-100 text-blue-700";
      case "Green": return "bg-green-100 text-green-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            {tab === "trophies" ? "Trophies" : "Badges"}
            {player ? <span className="ml-auto text-xs text-gray-500">{player.firstName} {player.lastName}</span> : null}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-3">
          <Button 
            variant={tab === "trophies" ? "default" : "outline"} 
            onClick={() => setTab("trophies")} 
            className={tab === "trophies" ? "bg-yellow-600 hover:bg-yellow-700" : ""} 
            data-testid="button-tab-trophies"
          >
            Trophies {!useFallback && `(${trophies.length})`}
          </Button>
          <Button 
            variant={tab === "badges" ? "default" : "outline"} 
            onClick={() => setTab("badges")} 
            className={tab === "badges" ? "bg-blue-600 hover:bg-blue-700" : ""} 
            data-testid="button-tab-awards"
          >
            Badges {!useFallback && `(${badges.length})`}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
          {useFallback ? (
            fallbackList.map((a) => (
              <button
                key={a.id}
                onClick={() => onGive(a.id, a.kind)}
                disabled={giving || !player}
                className={`text-left p-3 rounded-md border transition-colors hover:bg-gray-50 ${giving ? "opacity-70 cursor-not-allowed" : ""}`}
                data-testid={`button-award-${a.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${a.kind === "trophy" ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700"}`}>
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{a.name}</div>
                    <div className="text-xs text-gray-600">{a.description}</div>
                  </div>
                </div>
              </button>
            ))
          ) : displayList.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Award className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No {tab === "trophies" ? "trophies" : "badges"} available to give.</p>
              <p className="text-xs mt-1">Add manual awards in the Admin Panel.</p>
            </div>
          ) : (
            displayList.map((a) => (
              <button
                key={a.id}
                onClick={() => onGive(a.id, tab === "trophies" ? "trophy" : "badge")}
                disabled={giving || !player}
                className={`text-left p-3 rounded-md border transition-colors hover:bg-gray-50 ${giving ? "opacity-70 cursor-not-allowed" : ""}`}
                data-testid={`button-award-${a.id}`}
              >
                <div className="flex items-center gap-3">
                  {a.imageUrl ? (
                    <img src={a.imageUrl} alt={a.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getTierColor(a.tier)}`}>
                      {tab === "trophies" ? <Trophy className="h-5 w-5" /> : <Award className="h-5 w-5" />}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-2">
                      {a.name}
                      <Badge variant="outline" className="text-xs">{a.tier}</Badge>
                    </div>
                    <div className="text-xs text-gray-600">{a.description || "Manual award"}</div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="flex gap-2 pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1" data-testid="button-close-awards">Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Evaluation Dialog (Quarterly, per player) ---------- */
export function EvaluationDialog({
  open,
  onOpenChange,
  player,
  scores,
  setScores,
  quarter,
  setQuarter,
  year,
  setYear,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  player: PlayerLite | null;
  scores: EvalScores;
  setScores: (s: EvalScores) => void;
  quarter: Quarter;
  setQuarter: (q: Quarter) => void;
  year: number;
  setYear: (y: number) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const handleChange = (cat: SkillCategoryName, sub: string, val: number) => {
    setScores({
      ...scores,
      [cat]: { ...(scores[cat] || {}), [sub]: val },
    });
  };

  const catAvg = (cat: SkillCategoryName) => {
    const entries = Object.values(scores[cat] || {});
    return entries.length > 0 ? +(entries.reduce((a, b) => a + b, 0) / entries.length).toFixed(1) : 0;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Evaluate Skills
            {player ? <span className="ml-auto text-xs text-gray-500">{player.firstName} {player.lastName}</span> : null}
          </DialogTitle>
        </DialogHeader>

        {/* Quarter/Year */}
        <div className="flex gap-4 mb-4">
          <div>
            <label className="text-sm font-medium">Quarter</label>
            <div className="flex gap-1 mt-1">
              {(["Q1", "Q2", "Q3", "Q4"] as Quarter[]).map((q) => (
                <Button
                  key={q}
                  variant={quarter === q ? "default" : "outline"}
                  size="sm"
                  onClick={() => setQuarter(q)}
                  className={quarter === q ? "bg-red-600 hover:bg-red-700" : ""}
                  data-testid={`button-quarter-${q}`}
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Year</label>
            <div className="flex gap-1 mt-1">
              {[2024, 2025].map((y) => (
                <Button
                  key={y}
                  variant={year === y ? "default" : "outline"}
                  size="sm"
                  onClick={() => setYear(y)}
                  className={year === y ? "bg-red-600 hover:bg-red-700" : ""}
                  data-testid={`button-year-${y}`}
                >
                  {y}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Skills */}
        <div className="space-y-4">
          {SKILL_CATEGORIES.map((cat) => (
            <Card key={cat.name} className="p-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold">{cat.name}</h4>
                <Badge variant="outline" className="text-xs">
                  Avg: {catAvg(cat.name)}/5
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {cat.skills.map((skill) => {
                  const val = scores[cat.name]?.[skill] || 3;
                  return (
                    <div key={skill} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>{skill}</span>
                        <span>{val}/5</span>
                      </div>
                      <Slider
                        value={[val]}
                        onValueChange={([newVal]) => handleChange(cat.name, skill, newVal)}
                        min={1}
                        max={5}
                        step={1}
                        className="w-full"
                        data-testid={`slider-${cat.name}-${skill}`}
                      />
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
            }}
            className="flex-1"
            data-testid="button-cancel-evaluation"
          >
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving} className="flex-1 bg-red-600 hover:bg-red-700" data-testid="button-save-evaluation">
            {saving ? "Saving…" : "Save Evaluation"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}