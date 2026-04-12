import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  appAccountId?: number | null;
}

// Tier configuration with colors
const TIER_CONFIG = {
  "Prospect": { order: 1, color: "bg-gray-100 text-gray-700 border-gray-300" },
  "Starter": { order: 2, color: "bg-green-100 text-green-700 border-green-300" },
  "All-Star": { order: 3, color: "bg-blue-100 text-blue-700 border-blue-300" },
  "Superstar": { order: 4, color: "bg-purple-100 text-purple-700 border-purple-300" },
  "HOF": { order: 5, color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  "Legacy": { order: 6, color: "bg-gradient-to-r from-red-100 via-yellow-100 via-green-100 via-blue-100 to-purple-100 text-purple-700 border-purple-300" },
} as const;

const TIER_ORDER = ["Prospect", "Starter", "All-Star", "Superstar", "HOF", "Legacy"];

const getTierColor = (tier: string) => {
  return TIER_CONFIG[tier as keyof typeof TIER_CONFIG]?.color || "bg-gray-100 text-gray-700 border-gray-300";
};

/* ---------- Awards Dialog (All Manual Awards with Tier Filter) ---------- */
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
  const [filterTier, setFilterTier] = useState<string>("all");
  
  // Fetch manual award definitions from database
  const { data: awardDefinitions = [] } = useQuery<AwardDefinition[]>({
    queryKey: ["/api/award-definitions"],
    enabled: open,
  });

  // Filter for manual awards (coach-assignable) that are active
  const manualAwards = awardDefinitions.filter(
    (a) => a.triggerCategory === "manual" && a.active
  );

  // Apply tier filter
  const filteredAwards = filterTier === "all" 
    ? manualAwards 
    : manualAwards.filter((a) => a.tier === filterTier);

  // Sort by tier order (highest first)
  const sortedAwards = [...filteredAwards].sort((a, b) => {
    const orderA = TIER_CONFIG[a.tier as keyof typeof TIER_CONFIG]?.order || 0;
    const orderB = TIER_CONFIG[b.tier as keyof typeof TIER_CONFIG]?.order || 0;
    return orderB - orderA;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-red-600" />
            Give Award
            {player && (
              <span className="ml-auto text-sm font-normal text-gray-500">
                {player.firstName} {player.lastName}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Tier Filter */}
        <div className="mb-3">
          <Select value={filterTier} onValueChange={setFilterTier}>
            <SelectTrigger className="w-full" data-testid="select-tier-filter">
              <SelectValue placeholder="Filter by tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers ({manualAwards.length})</SelectItem>
              {TIER_ORDER.map((tier) => {
                const count = manualAwards.filter((a) => a.tier === tier).length;
                return (
                  <SelectItem key={tier} value={tier}>
                    <span className="flex items-center gap-2">
                      <span className={`inline-block w-3 h-3 rounded-full ${getTierColor(tier).split(' ')[0]}`}></span>
                      {tier} ({count})
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto">
          {sortedAwards.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Award className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No awards available</p>
              <p className="text-xs mt-1">
                {filterTier === "all" 
                  ? "Add manual awards in the Admin Panel to give them to players."
                  : `No ${filterTier} tier awards found. Try a different filter.`}
              </p>
            </div>
          ) : (
            sortedAwards.map((a) => (
              <button
                key={a.id}
                onClick={() => onGive(a.id, "badge")}
                disabled={giving || !player}
                className={`text-left p-3 rounded-lg border transition-colors hover:bg-gray-50 active:bg-gray-100 ${giving ? "opacity-70 cursor-not-allowed" : ""}`}
                data-testid={`button-award-${a.id}`}
              >
                <div className="flex items-center gap-3">
                  {a.imageUrl ? (
                    <img src={a.imageUrl} alt={a.name} className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getTierColor(a.tier)}`}>
                      <Award className="h-6 w-6" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium flex items-center gap-2 flex-wrap">
                      <span className="truncate">{a.name}</span>
                      <Badge variant="outline" className={`text-xs ${getTierColor(a.tier)}`}>
                        {a.tier}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {a.description || "Coach-assigned award"}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="flex gap-2 pt-3 border-t">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="flex-1" 
            data-testid="button-close-awards"
          >
            Cancel
          </Button>
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
  const quarters: Quarter[] = ["Q1", "Q2", "Q3", "Q4"];
  const years = [new Date().getFullYear(), new Date().getFullYear() - 1];
  
  const setSkillScore = (cat: SkillCategoryName, skill: string, val: number) => {
    setScores({
      ...scores,
      [cat]: { ...(scores[cat] ?? {}), [skill]: val },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Evaluate {player?.firstName} {player?.lastName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          {quarters.map((q) => (
            <Button
              key={q}
              variant={quarter === q ? "default" : "outline"}
              size="sm"
              onClick={() => setQuarter(q)}
              data-testid={`button-quarter-${q}`}
            >
              {q}
            </Button>
          ))}
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="ml-auto border rounded px-2"
            data-testid="select-year"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {SKILL_CATEGORIES.map((cat) => (
          <div key={cat.name} className="mb-4">
            <h4 className="font-semibold text-sm text-gray-700 mb-2">{cat.name}</h4>
            {cat.skills.map((skill) => {
              const val = scores[cat.name]?.[skill] ?? 3;
              return (
                <div key={skill} className="flex items-center gap-3 mb-2">
                  <span className="w-28 text-xs text-gray-600">{skill}</span>
                  <Slider
                    value={[val]}
                    min={1}
                    max={5}
                    step={1}
                    onValueChange={([v]) => setSkillScore(cat.name, skill, v)}
                    className="flex-1"
                    data-testid={`slider-${cat.name}-${skill}`}
                  />
                  <span className="w-4 text-xs font-medium">{val}</span>
                </div>
              );
            })}
          </div>
        ))}

        <div className="flex gap-2 pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1" data-testid="button-cancel-eval">Cancel</Button>
          <Button onClick={onSave} disabled={saving} className="flex-1 bg-red-600 hover:bg-red-700" data-testid="button-save-eval">
            {saving ? "Saving..." : "Save Evaluation"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
