import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

// All skill categories with correct breakdown
const SKILL_CATEGORIES = [
  {
    name: "SHOOTING",
    skills: ["LAYUP", "2PT RANGE", "3PT RANGE"],
    averageScore: 72
  },
  {
    name: "DRIBBLING", 
    skills: ["LEFT", "RIGHT", "CONTROL", "SPEED"],
    averageScore: 85
  },
  {
    name: "PASSING",
    skills: ["BOUNCE", "CHEST", "OVERHEAD", "CATCHING"],
    averageScore: 68
  },
  {
    name: "DEFENSE",
    skills: ["TALKING", "STANCE", "CLOSEOUT"],
    averageScore: 74
  },
  {
    name: "REBOUNDING",
    skills: ["BOX OUT", "BALL PROTECTION", "ANTICIPATION"],
    averageScore: 78
  },
  {
    name: "ATHLETIC ABILITY",
    skills: ["STAMINA", "QUICKNESS", "COORDINATION"],
    averageScore: 82
  },
  {
    name: "COACHABILITY",
    skills: ["ATTITUDE", "FOCUS", "WORK ETHIC", "ACCEPTS CRITICISM"],
    averageScore: 88
  }
];

// Mock individual skill scores
const getSkillScore = (category: string, skill: string) => {
  const base = SKILL_CATEGORIES.find(c => c.name === category)?.averageScore || 75;
  return Math.min(100, Math.max(0, base + Math.floor(Math.random() * 20 - 10)));
};

export default function SkillsPage() {
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  return (
    <div className="min-h-screen-safe bg-background">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-40">
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

      {/* Content */}
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {!selectedCategory ? (
          // Category Overview
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Skills Progress</h2>
              <p className="text-gray-600">Track your development across all basketball fundamentals</p>
            </div>

            {SKILL_CATEGORIES.map((category) => (
              <Card key={category.name} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4" onClick={() => setSelectedCategory(category.name)}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">{category.name}</h3>
                    <span className="text-red-600 font-bold text-lg">{category.averageScore}%</span>
                  </div>
                  
                  <div className="space-y-1">
                    <Progress value={category.averageScore} className="h-3" />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{category.skills.length} skills assessed</span>
                      <span>
                        {category.averageScore >= 90 ? "Excellent" : 
                         category.averageScore >= 80 ? "Very Good" :
                         category.averageScore >= 70 ? "Good" :
                         category.averageScore >= 60 ? "Developing" : "Needs Work"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          // Individual Category Detail
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

              return (
                <div className="space-y-4">
                  {/* Category Overview */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-red-600 mb-2">{category.averageScore}%</div>
                        <div className="text-gray-600">Overall {category.name.toLowerCase()} score</div>
                        <Progress value={category.averageScore} className="mt-4 h-4" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Individual Skills */}
                  {category.skills.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-gray-900">Individual Skills</h3>
                      {category.skills.map((skill) => {
                        const score = getSkillScore(category.name, skill);
                        return (
                          <Card key={skill}>
                            <CardContent className="p-4">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-medium text-gray-700">{skill}</span>
                                <span className="text-red-600 font-semibold">{score}%</span>
                              </div>
                              <Progress value={score} className="h-2" />
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}

                  {/* Notes */}
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-2">Coach Notes</h3>
                      <p className="text-gray-600 text-sm">
                        {category.averageScore >= 80 
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