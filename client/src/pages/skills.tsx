import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, TrendingUp, Calendar, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { usePlayerAccess } from "@/hooks/usePlayerAccess";
import { AccessPaywall } from "@/components/AccessPaywall";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { SKILL_CATEGORIES } from "@/components/CoachAwardDialogs";

function scoreToPercent(val: number): number {
  return Math.round((val / 5) * 100);
}

function computeOvr(scores: Record<string, Record<string, number>>): number {
  let total = 0;
  let count = 0;
  for (const cat of Object.values(scores)) {
    if (cat && typeof cat === "object") {
      for (const s of Object.values(cat as Record<string, number>)) {
        if (typeof s === "number" && s > 0) {
          total += s;
          count++;
        }
      }
    }
  }
  return count > 0 ? Math.round((total / count) * 20) : 0;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type ViewMode = "history" | "latest" | "detail";

export default function SkillsPage() {
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("history");
  const [selectedEvalIndex, setSelectedEvalIndex] = useState<number | null>(null);
  const { user } = useAuth();

  const selectedPlayerId = typeof window !== "undefined" ? localStorage.getItem("selectedPlayerId") : null;
  const activeProfileId = selectedPlayerId || (user as any)?.activeProfileId || (user as any)?.id;

  // Task #263: shared player-access guard — bypassed for coach/admin/parent.
  const { access: skillsAccess, bypass: skillsBypass } = usePlayerAccess(activeProfileId);
  const skillsBlocked = !skillsBypass && !!skillsAccess && !skillsAccess.canAccess;

  const { data: playerProfile } = useQuery<any>({
    queryKey: ["/api/profile", activeProfileId],
    enabled: !!activeProfileId && activeProfileId !== (user as any)?.id,
  });

  const { data: evaluations, isLoading } = useQuery<any[]>({
    queryKey: ["/api/coach/evaluations", { playerId: activeProfileId }],
    queryFn: async () => {
      return await apiRequest(`/api/coach/evaluations?playerId=${activeProfileId}`);
    },
    enabled: !!activeProfileId,
  });

  const profile = playerProfile || user;
  const latestAssessments: Record<string, Record<string, number>> =
    (profile as any)?.skillsAssessments || {};

  const sortedEvals = (evaluations || []).slice().sort(
    (a: any, b: any) => new Date(b.createdAt || b.updatedAt || 0).getTime() - new Date(a.createdAt || a.updatedAt || 0).getTime()
  );

  const hasAnyData = sortedEvals.length > 0 || Object.keys(latestAssessments).length > 0;

  const activeScores: Record<string, Record<string, number>> =
    selectedEvalIndex !== null && sortedEvals[selectedEvalIndex]
      ? sortedEvals[selectedEvalIndex].scores
      : latestAssessments;

  const getCategoryAverage = (catName: string, skills: readonly string[], scores: Record<string, Record<string, number>>) => {
    const catScores = scores[catName];
    if (!catScores) return null;
    let total = 0;
    let count = 0;
    for (const skill of skills) {
      if (typeof catScores[skill] === "number") {
        total += catScores[skill];
        count++;
      }
    }
    if (count === 0) return null;
    return scoreToPercent(total / count);
  };

  const getSkillScore = (catName: string, skill: string, scores: Record<string, Record<string, number>>): number | null => {
    const val = scores[catName]?.[skill];
    return typeof val === "number" ? scoreToPercent(val) : null;
  };

  const handleBack = () => {
    if (selectedCategory) {
      setSelectedCategory(null);
    } else if (viewMode === "latest" || viewMode === "detail") {
      setViewMode("history");
      setSelectedEvalIndex(null);
      setSelectedCategory(null);
    } else {
      setLocation("/player-dashboard");
    }
  };

  const selectEval = (index: number) => {
    setSelectedEvalIndex(index);
    setViewMode("detail");
    setSelectedCategory(null);
  };

  const viewLatestBreakdown = () => {
    setSelectedEvalIndex(null);
    setViewMode("latest");
    setSelectedCategory(null);
  };

  const renderCategoryList = (scores: Record<string, Record<string, number>>) => (
    <div className="space-y-3">
      {SKILL_CATEGORIES.map((category) => {
        const avg = getCategoryAverage(category.name, category.skills, scores);
        if (avg === null) return null;
        return (
          <Card key={category.name} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4" onClick={() => setSelectedCategory(category.name)}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{category.name}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-red-600 font-bold text-lg">{avg}%</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
              <Progress value={avg} className="h-2.5" />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{category.skills.length} skills</span>
                <span>
                  {avg >= 90 ? "Excellent" :
                   avg >= 80 ? "Very Good" :
                   avg >= 70 ? "Good" :
                   avg >= 60 ? "Developing" : "Needs Work"}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  const renderSkillDetail = (scores: Record<string, Record<string, number>>) => {
    const category = SKILL_CATEGORIES.find(c => c.name === selectedCategory);
    if (!category) return null;
    const avg = getCategoryAverage(category.name, category.skills, scores);

    return (
      <div className="space-y-4">
        {avg !== null && (
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600 mb-1">{avg}%</div>
                <div className="text-gray-600 dark:text-gray-400 text-sm">Overall {category.name.toLowerCase()} score</div>
                <Progress value={avg} className="mt-3 h-3" />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          {category.skills.map((skill) => {
            const score = getSkillScore(category.name, skill, scores);
            return (
              <Card key={skill}>
                <CardContent className="p-3">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-medium text-gray-700 dark:text-gray-300 text-sm">{skill}</span>
                    <span className="text-red-600 font-semibold text-sm">
                      {score !== null ? `${score}%` : "—"}
                    </span>
                  </div>
                  <Progress value={score ?? 0} className="h-2" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  if (skillsBlocked && skillsAccess) {
    return <AccessPaywall access={skillsAccess} feature="Skills" />;
  }

  return (
    <div className="min-h-screen-safe bg-background safe-bottom safe-top">
      <div className="bg-card border-b sticky z-40" style={{ top: 'var(--safe-area-top, 0px)' }}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-red-600" />
              <h1 className="text-lg font-semibold">
                {selectedCategory
                  ? selectedCategory
                  : viewMode === "detail" && selectedEvalIndex !== null
                    ? `${sortedEvals[selectedEvalIndex]?.quarter} ${sortedEvals[selectedEvalIndex]?.year}`
                    : "Skills Assessment"}
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 max-w-2xl md:max-w-3xl lg:max-w-4xl">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">
            <div className="animate-spin w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-sm">Loading evaluations...</p>
          </div>
        ) : !hasAnyData ? (
          <div className="text-center py-12 text-gray-500">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No Evaluations Yet</h2>
            <p className="text-sm">Your coach hasn't submitted a skills evaluation yet. Check back after your next session!</p>
          </div>
        ) : viewMode === "history" && !selectedCategory ? (
          <div className="space-y-4">
            {Object.keys(latestAssessments).length > 0 && (
              <Card className="border-red-200 bg-gradient-to-r from-red-50 to-white dark:from-red-950/20 dark:to-background cursor-pointer hover:shadow-md transition-shadow" onClick={viewLatestBreakdown}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-red-600 font-medium uppercase tracking-wide mb-1">Current Rating</div>
                      <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        {computeOvr(latestAssessments)}
                        <span className="text-base font-normal text-gray-500 ml-1">OVR</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-red-600">
                      <span className="text-sm font-medium">View Breakdown</span>
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex items-center gap-2 mt-6 mb-3">
              <Clock className="w-4 h-4 text-gray-500" />
              <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300">Evaluation History</h2>
              <span className="text-xs text-gray-400">({sortedEvals.length})</span>
            </div>

            {sortedEvals.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No evaluations recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {sortedEvals.map((ev: any, index: number) => {
                  const ovr = computeOvr(ev.scores || {});
                  return (
                    <Card
                      key={ev.id || index}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => selectEval(index)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                              <span className="text-red-600 font-bold text-lg">{ovr}</span>
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-gray-100">
                                {ev.quarter} {ev.year}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Calendar className="w-3 h-3" />
                                <span>{formatDate(ev.createdAt || ev.updatedAt)}</span>
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        ) : (viewMode === "latest" || viewMode === "detail") && !selectedCategory ? (
          renderCategoryList(activeScores)
        ) : selectedCategory ? (
          renderSkillDetail(activeScores)
        ) : null}
      </div>
    </div>
  );
}
