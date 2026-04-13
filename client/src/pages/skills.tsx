import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { SKILL_CATEGORIES } from "@/components/CoachAwardDialogs";

function scoreToPercent(val: number): number {
  return Math.round((val / 5) * 100);
}

export default function SkillsPage() {
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { user } = useAuth();

  const assessments: Record<string, Record<string, number>> = (user as any)?.skillsAssessments || {};

  const hasAssessments = Object.keys(assessments).length > 0;

  const getCategoryAverage = (catName: string, skills: readonly string[]) => {
    const catScores = assessments[catName];
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

  const getSkillScore = (catName: string, skill: string): number | null => {
    const val = assessments[catName]?.[skill];
    return typeof val === "number" ? scoreToPercent(val) : null;
  };

  return (
    <div className="min-h-screen-safe bg-background safe-bottom safe-top">
      <div className="bg-card border-b sticky z-40" style={{ top: 'var(--safe-area-top, 0px)' }}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation("/player-dashboard")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-red-600" />
              <h1 className="text-xl font-semibold">Skills Assessment</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-2xl md:max-w-3xl lg:max-w-4xl">
        {!hasAssessments ? (
          <div className="text-center py-12 text-gray-500">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <h2 className="text-lg font-semibold text-gray-700 mb-2">No Evaluations Yet</h2>
            <p className="text-sm">Your coach hasn't submitted a skills evaluation yet. Check back after your next session!</p>
          </div>
        ) : !selectedCategory ? (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Skills Progress</h2>
              <p className="text-gray-600">Track your development across all basketball fundamentals</p>
            </div>

            {SKILL_CATEGORIES.map((category) => {
              const avg = getCategoryAverage(category.name, category.skills);
              if (avg === null) return null;
              return (
                <Card key={category.name} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4" onClick={() => setSelectedCategory(category.name)}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">{category.name}</h3>
                      <span className="text-red-600 font-bold text-lg">{avg}%</span>
                    </div>
                    
                    <div className="space-y-1">
                      <Progress value={avg} className="h-3" />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{category.skills.length} skills assessed</span>
                        <span>
                          {avg >= 90 ? "Excellent" : 
                           avg >= 80 ? "Very Good" :
                           avg >= 70 ? "Good" :
                           avg >= 60 ? "Developing" : "Needs Work"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedCategory(null)}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-2xl font-bold text-gray-900">{selectedCategory}</h2>
            </div>

            {(() => {
              const category = SKILL_CATEGORIES.find(c => c.name === selectedCategory);
              if (!category) return null;
              const avg = getCategoryAverage(category.name, category.skills);

              return (
                <div className="space-y-4">
                  {avg !== null && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-red-600 mb-2">{avg}%</div>
                          <div className="text-gray-600">Overall {category.name.toLowerCase()} score</div>
                          <Progress value={avg} className="mt-4 h-4" />
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900">Individual Skills</h3>
                    {category.skills.map((skill) => {
                      const score = getSkillScore(category.name, skill);
                      return (
                        <Card key={skill}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium text-gray-700">{skill}</span>
                              <span className="text-red-600 font-semibold">
                                {score !== null ? `${score}%` : "—"}
                              </span>
                            </div>
                            <Progress value={score ?? 0} className="h-2" />
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-2">Coach Notes</h3>
                      <p className="text-gray-600 text-sm">
                        {avg !== null && avg >= 80 
                          ? `Excellent work on ${category.name.toLowerCase()}! Keep practicing to maintain this high level.`
                          : `Good progress on ${category.name.toLowerCase()}. Focus on the specific skills below to improve your overall score.`
                        }
                      </p>
                    </CardContent>
                  </Card>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
