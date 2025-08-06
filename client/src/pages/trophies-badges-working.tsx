import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Trophy, Award, Star, Shield, Target, Zap } from "lucide-react";

// Badge tier styles mapping
const TIER_STYLES = {
  "Hall of Famer": {
    bg: "bg-yellow-500",
    text: "text-yellow-600",
    border: "border-yellow-500"
  },
  "Superstar": {
    bg: "bg-purple-500", 
    text: "text-purple-600",
    border: "border-purple-500"
  },
  "All-Star": {
    bg: "bg-blue-500",
    text: "text-blue-600", 
    border: "border-blue-500"
  },
  "Starter": {
    bg: "bg-green-500",
    text: "text-green-600",
    border: "border-green-500"
  },
  "Prospect": {
    bg: "bg-gray-500",
    text: "text-gray-600",
    border: "border-gray-500"
  }
};

const TIERS = ["All", "Hall of Famer", "Superstar", "All-Star", "Starter", "Prospect"];
const BADGE_TYPES = ["All", "MVP", "Hustle", "Teammate", "Clutch"];

// Sample trophy data
const mockTrophies = [
  {
    id: 1,
    name: "Coach's Award",
    description: "Awarded for exceptional leadership and dedication",
    tier: "Hall of Famer",
    earned: true,
    dateEarned: "2024-12-15"
  }
];

// Sample badge data with comprehensive examples
const mockBadges = [
  {
    id: 1,
    name: "Championship MVP",
    description: "Most Valuable Player in championship game",
    type: "MVP",
    tier: "Hall of Famer",
    earned: true
  },
  {
    id: 2,
    name: "Season Leader",
    description: "Led team in multiple statistical categories",
    type: "MVP",
    tier: "Hall of Famer",
    earned: false
  },
  {
    id: 3,
    name: "Game Winner",
    description: "Hit the game-winning shot in crucial moments",
    type: "Clutch",
    tier: "Superstar",
    earned: true
  },
  {
    id: 4,
    name: "Defensive Anchor",
    description: "Exceptional defensive performance throughout season",
    type: "Hustle",
    tier: "Superstar",
    earned: true
  },
  {
    id: 5,
    name: "Triple Double",
    description: "Achieved triple-double in a game",
    type: "MVP",
    tier: "All-Star",
    earned: true
  },
  {
    id: 6,
    name: "Team Captain",
    description: "Demonstrated outstanding leadership",
    type: "Teammate",
    tier: "All-Star",
    earned: true
  },
  {
    id: 7,
    name: "Perfect Attendance",
    description: "Attended every practice and game",
    type: "Teammate",
    tier: "Starter",
    earned: true
  },
  {
    id: 8,
    name: "Hustle Play",
    description: "Made exceptional hustle plays",
    type: "Hustle",
    tier: "Starter",
    earned: true
  },
  {
    id: 9,
    name: "First Points",
    description: "Scored first points of basketball career",
    type: "MVP",
    tier: "Prospect",
    earned: true
  },
  {
    id: 10,
    name: "Team Player",
    description: "Always encouraged teammates",
    type: "Teammate",
    tier: "Prospect",
    earned: true
  },
  {
    id: 11,
    name: "Clutch Shooter",
    description: "Made crucial shots in tight games",
    type: "Clutch",
    tier: "All-Star",
    earned: true
  },
  {
    id: 12,
    name: "Practice Player",
    description: "Consistently gave maximum effort in practice",
    type: "Hustle",
    tier: "Starter",
    earned: true
  },
  {
    id: 13,
    name: "Mentor",
    description: "Helped younger players develop their skills",
    type: "Teammate",
    tier: "Superstar",
    earned: true
  },
  {
    id: 14,
    name: "Comeback Kid",
    description: "Led team comebacks in multiple games",
    type: "Clutch",
    tier: "All-Star",
    earned: true
  },
  {
    id: 15,
    name: "Energy Booster",
    description: "Always brought positive energy to the team",
    type: "Teammate",
    tier: "Starter",
    earned: true
  },
  {
    id: 16,
    name: "Floor General",
    description: "Exceptional court vision and leadership",
    type: "MVP",
    tier: "Superstar",
    earned: true
  },
  {
    id: 17,
    name: "Gritty Defender",
    description: "Never gave up on defensive plays",
    type: "Hustle",
    tier: "All-Star",
    earned: true
  },
  {
    id: 18,
    name: "Improvement Award",
    description: "Showed remarkable improvement throughout season",
    type: "Hustle",
    tier: "Prospect",
    earned: true
  }
];

function getBadgeIcon(type: string) {
  if (type === "MVP") return <Star className="w-6 h-6" />;
  if (type === "Hustle") return <Zap className="w-6 h-6" />;
  if (type === "Teammate") return <Shield className="w-6 h-6" />;
  if (type === "Clutch") return <Target className="w-6 h-6" />;
  return <Award className="w-6 h-6" />;
}

export default function TrophiesBadges() {
  const [, setLocation] = useLocation();
  const [filterTier, setFilterTier] = useState("All");
  const [filterType, setFilterType] = useState("All");

  const earnedTrophies = mockTrophies.filter(trophy => trophy.earned);
  const earnedBadges = mockBadges.filter(badge => badge.earned);

  // Filter badges based on selected filters
  const filteredBadges = mockBadges.filter(badge => {
    const tierMatch = filterTier === "All" || badge.tier === filterTier;
    const typeMatch = filterType === "All" || badge.type === filterType;
    return tierMatch && typeMatch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-md mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLocation('/player-dashboard')}
              className="p-2 hover:bg-gray-100 rounded-md"
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Trophies & Badges</h1>
          </div>
        </div>
      </div>

      <main className="max-w-md mx-auto p-6 space-y-6">
        {/* Trophies Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            Trophies ({earnedTrophies.length})
          </h2>
          
          <div className="space-y-3">
            {earnedTrophies.map((trophy) => (
              <div 
                key={trophy.id}
                className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm"
                data-testid={`trophy-${trophy.id}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Trophy className="w-8 h-8 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{trophy.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{trophy.description}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                        {trophy.tier}
                      </span>
                      <span className="text-xs text-gray-500">
                        Earned {trophy.dateEarned}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Badges Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Award className="h-5 w-5 text-blue-600" />
              Badges ({earnedBadges.length})
            </h2>
            
            {/* Filter Controls */}
            <div className="flex gap-2">
              <select 
                value={filterTier} 
                onChange={(e) => setFilterTier(e.target.value)}
                className="w-32 px-3 py-2 border border-gray-300 rounded-md text-sm"
                data-testid="select-tier-filter"
              >
                {TIERS.map((tier) => (
                  <option key={tier} value={tier}>
                    {tier}
                  </option>
                ))}
              </select>
              
              <select 
                value={filterType} 
                onChange={(e) => setFilterType(e.target.value)}
                className="w-32 px-3 py-2 border border-gray-300 rounded-md text-sm"
                data-testid="select-type-filter"
              >
                {BADGE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Badges Grid */}
          <div className="grid grid-cols-3 gap-4">
            {filteredBadges.map((badge) => {
              const tierKey = badge.tier as keyof typeof TIER_STYLES;
              const tierStyle = TIER_STYLES[tierKey];
              
              return (
                <div
                  key={badge.id}
                  className="relative bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                  title={badge.description}
                  data-testid={`badge-${badge.id}`}
                >
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      badge.earned ? tierStyle.bg : 'bg-gray-200'
                    }`}>
                      <div className={badge.earned ? tierStyle.text : 'text-gray-400'}>
                        {getBadgeIcon(badge.type)}
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-xs text-gray-900 leading-tight">
                        {badge.name}
                      </p>
                      <p className="text-xs text-gray-600 capitalize">{badge.tier}</p>
                      {badge.earned && (
                        <p className="text-xs text-green-600 mt-1">
                          ✓ Earned
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Status indicator */}
                  <div className={`absolute top-1 right-1 w-3 h-3 rounded-full ${
                    badge.earned ? tierStyle.bg : 'bg-gray-300'
                  } ${tierStyle.border} border`} />
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}