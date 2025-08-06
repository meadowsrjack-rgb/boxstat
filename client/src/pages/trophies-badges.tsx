import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Filter, Trophy, Award, Star, Shield, Target, Zap } from "lucide-react";

// Badge tier colors
const TIER_COLORS = {
  grey: { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200" },
  green: { bg: "bg-green-100", text: "text-green-600", border: "border-green-200" },
  blue: { bg: "bg-blue-100", text: "text-blue-600", border: "border-blue-200" },
  purple: { bg: "bg-purple-100", text: "text-purple-600", border: "border-purple-200" },
  yellow: { bg: "bg-yellow-100", text: "text-yellow-600", border: "border-yellow-200" },
};

// Sample trophies data based on the attached file
const SAMPLE_TROPHIES = [
  {
    id: 1,
    name: "Coach's Award",
    description: "Given to the player who best exemplifies the team's core values and the coach's philosophy",
    type: "team",
    earned: true,
    earnedAt: "2024-05-15",
  }
];

// Sample badges data based on the attached file with tier system
const SAMPLE_BADGES = [
  // Hall of Famer (Yellow)
  { id: 1, name: "Practice Legend", description: "For attending 250 total team practices", tier: "yellow", type: "Dedication", earned: false },
  { id: 2, name: "Dynasty Member", description: "For being an active member of the team for five full years", tier: "yellow", type: "Dedication", earned: false },
  
  // Superstar (Purple)  
  { id: 3, name: "Marquee Player", description: "For being a recognized star and reliable top performer (5× MVP)", tier: "purple", type: "MVP", earned: false },
  { id: 4, name: "The Workhorse", description: "For having an elite work ethic (5× Hustle)", tier: "purple", type: "Hustle", earned: false },
  { id: 5, name: "Practice Centurion", description: "For attending 100 total team practices", tier: "purple", type: "Dedication", earned: false },
  { id: 6, name: "Ironman", description: "For playing in every single game of a season", tier: "purple", type: "Dedication", earned: true, earnedAt: "2024-06-20" },
  
  // All-Star (Blue)
  { id: 7, name: "Game Changer", description: "For consistently making a pivotal impact (3× MVP)", tier: "blue", type: "MVP", earned: false },
  { id: 8, name: "The Engine", description: "For being a consistent source of energy (3× Hustle)", tier: "blue", type: "Hustle", earned: true, earnedAt: "2024-04-10" },
  { id: 9, name: "The Glue", description: "For being a positive and unifying presence (3× Teammate)", tier: "blue", type: "Teammate", earned: true, earnedAt: "2024-03-22" },
  { id: 10, name: "Practice Fiend", description: "For attending 50 total practices", tier: "blue", type: "Dedication", earned: true, earnedAt: "2024-02-14" },
  { id: 11, name: "Seasoned Competitor", description: "For playing in 50 total games", tier: "blue", type: "Games", earned: true, earnedAt: "2024-05-08" },
  
  // Starter (Green)
  { id: 12, name: "Locked In", description: "For attending 10 consecutive scheduled practices", tier: "green", type: "Dedication", earned: true, earnedAt: "2024-01-15" },
  { id: 13, name: "Tournament Titan", description: "For checking into all games in a single tournament", tier: "green", type: "Games", earned: true, earnedAt: "2024-03-01" },
  { id: 14, name: "Game MVP", description: "Instrumental in the team's performance during a single game", tier: "green", type: "MVP", earned: true, earnedAt: "2024-04-05" },
  { id: 15, name: "Clutch Player", description: "Given for making a game-changing play under pressure", tier: "green", type: "Clutch", earned: true, earnedAt: "2024-04-12" },
  { id: 16, name: "Hustle Award", description: "Relentless hustle and effort", tier: "green", type: "Hustle", earned: true, earnedAt: "2024-02-28" },
  { id: 17, name: "Teammate Award", description: "Encouraging, supportive, or unselfish play", tier: "green", type: "Teammate", earned: true, earnedAt: "2024-03-15" },
  { id: 18, name: "Student of the Game", description: "Exceptional listening skills and attentiveness", tier: "green", type: "Learning", earned: true, earnedAt: "2024-02-10" },
  { id: 19, name: "Lead by Example", description: "For flawlessly demonstrating a drill or skill", tier: "green", type: "Leadership", earned: true, earnedAt: "2024-01-25" },
  
  // Prospect (Grey)
  { id: 20, name: "Checked In", description: "For checking into any UYP event", tier: "grey", type: "First Steps", earned: true, earnedAt: "2023-12-01" },
  { id: 21, name: "The Debut", description: "For playing in your very first game", tier: "grey", type: "First Steps", earned: true, earnedAt: "2023-12-05" },
  { id: 22, name: "Friday Follower", description: "For playing in your first Friday Night Hoops game", tier: "grey", type: "FNH", earned: true, earnedAt: "2023-12-08" },
  { id: 23, name: "Game Planner", description: "For RSVPing to a Game within its proper window", tier: "grey", type: "Planning", earned: true, earnedAt: "2023-12-12" },
  { id: 24, name: "Practice Planner", description: "For RSVPing to a Practice, Skill, or FNH event", tier: "grey", type: "Planning", earned: true, earnedAt: "2023-12-10" },
  { id: 25, name: "First Reps", description: "For attending 10 total practices", tier: "grey", type: "Dedication", earned: true, earnedAt: "2024-01-08" },
  { id: 26, name: "First Ten", description: "For playing in 10 total games", tier: "grey", type: "Games", earned: true, earnedAt: "2024-01-20" },
  { id: 27, name: "FNH Fighter", description: "For playing in 10 total FNH games", tier: "grey", type: "FNH", earned: true, earnedAt: "2024-01-30" },
];

const BADGE_TYPES = [
  "All Types",
  "MVP", 
  "Hustle", 
  "Teammate", 
  "Clutch", 
  "Dedication", 
  "Leadership", 
  "Learning", 
  "Games", 
  "FNH", 
  "First Steps", 
  "Planning"
];

const TIERS = [
  "All Tiers",
  "Hall of Famer",
  "Superstar", 
  "All-Star",
  "Starter",
  "Prospect"
];

const TIER_MAPPING = {
  "All Tiers": "",
  "Hall of Famer": "yellow",
  "Superstar": "purple",
  "All-Star": "blue",
  "Starter": "green",
  "Prospect": "grey"
};

export default function TrophiesBadges() {
  const [, setLocation] = useLocation();
  const [filterType, setFilterType] = useState("All Types");
  const [filterTier, setFilterTier] = useState("All Tiers");

  // Filter badges based on selected filters
  const filteredBadges = SAMPLE_BADGES.filter(badge => {
    const typeMatch = filterType === "All Types" || badge.type === filterType;
    const tierMatch = filterTier === "All Tiers" || badge.tier === TIER_MAPPING[filterTier as keyof typeof TIER_MAPPING];
    return typeMatch && tierMatch;
  });

  const earnedTrophies = SAMPLE_TROPHIES.filter(trophy => trophy.earned);
  const earnedBadges = SAMPLE_BADGES.filter(badge => badge.earned);

  const getBadgeIcon = (type: string) => {
    switch (type) {
      case "MVP": return <Star className="w-6 h-6" />;
      case "Hustle": return <Zap className="w-6 h-6" />;
      case "Teammate": return <Shield className="w-6 h-6" />;
      case "Clutch": return <Target className="w-6 h-6" />;
      default: return <Award className="w-6 h-6" />;
    }
  };

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

      {/* Main Content */}
      <main className="max-w-md mx-auto p-6 space-y-6">
        {/* Trophies Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            Trophies ({earnedTrophies.length})
          </h2>
          
          <div className="grid grid-cols-2 gap-3">
            {SAMPLE_TROPHIES.map((trophy) => (
              <div
                key={trophy.id}
                className={`relative p-4 rounded-lg border-2 transition-all duration-200 ${
                  trophy.earned 
                    ? 'bg-yellow-50 border-yellow-200' 
                    : 'bg-gray-100 border-gray-200 opacity-60'
                }`}
                data-testid={`trophy-${trophy.id}`}
                title={`${trophy.name}: ${trophy.description}`}
              >
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    trophy.earned ? 'bg-yellow-100' : 'bg-gray-200'
                  }`}>
                    <Trophy className={`w-8 h-8 ${
                      trophy.earned ? 'text-yellow-600' : 'text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{trophy.name}</p>
                    <p className="text-xs text-gray-600">{trophy.type}</p>
                    {trophy.earned && trophy.earnedAt && (
                      <p className="text-xs text-green-600 mt-1">
                        Earned {new Date(trophy.earnedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Badges Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Award className="h-5 w-5 text-blue-600" />
              Badges ({earnedBadges.length})
            </h2>
            
            {/* Filter Button */}
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
          
          <div className="grid grid-cols-3 gap-3">
            {filteredBadges.map((badge) => {
              const tierStyle = TIER_COLORS[badge.tier as keyof typeof TIER_COLORS];
              
              return (
                <div
                  key={badge.id}
                  className={`relative p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                    badge.earned 
                      ? `${tierStyle.bg} ${tierStyle.border}` 
                      : 'bg-gray-100 border-gray-200 opacity-60'
                  }`}
                  data-testid={`badge-${badge.id}`}
                  title={`${badge.name}: ${badge.description}`}
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
                      {badge.earned && badge.earnedAt && (
                        <p className="text-xs text-green-600 mt-1">
                          {new Date(badge.earnedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Tier indicator in corner */}
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