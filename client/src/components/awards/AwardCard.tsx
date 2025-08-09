
import { Award } from "@/lib/awards.types";
import { getAwardProgress, UserStats } from "@/lib/awards.progress";
import { TIER_COLORS } from "@/lib/awards.registry";
import { Trophy, Award as AwardIcon, Star, Zap, Shield, Target } from "lucide-react";

interface AwardCardProps {
  award: Award;
  userStats: UserStats;
  onClick: () => void;
}

export function AwardCard({ award, userStats, onClick }: AwardCardProps) {
  const progress = getAwardProgress(award, userStats);
  const tierStyle = TIER_COLORS[award.tier];
  const isEarned = progress.earned;

  const getIcon = () => {
    if (award.kind === "Trophy") {
      return <Trophy className="w-6 h-6" />;
    }
    
    // Badge icons based on category or specific award types
    if (award.name.includes("MVP")) return <Star className="w-6 h-6" />;
    if (award.name.includes("Hustle")) return <Zap className="w-6 h-6" />;
    if (award.name.includes("Teammate")) return <Shield className="w-6 h-6" />;
    if (award.name.includes("Clutch")) return <Target className="w-6 h-6" />;
    
    return <AwardIcon className="w-6 h-6" />;
  };

  const getProgressDisplay = () => {
    if (progress.current !== undefined && progress.target !== undefined) {
      return `${progress.current}/${progress.target}`;
    }
    return isEarned ? "✓" : "—";
  };

  return (
    <div
      onClick={onClick}
      className={`relative cursor-pointer rounded-lg border-2 p-3 transition-all duration-200 hover:scale-105 hover:shadow-md ${
        isEarned 
          ? `${tierStyle.bg.replace('bg-', 'bg-opacity-10 bg-')} ${tierStyle.border}` 
          : 'bg-gray-100 border-gray-200 opacity-60 grayscale'
      }`}
      title={award.description}
    >
      <div className="flex flex-col items-center text-center space-y-2">
        {/* Icon */}
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
          isEarned ? tierStyle.bg.replace('bg-', 'bg-opacity-20 bg-') : 'bg-gray-200'
        }`}>
          <div className={isEarned ? tierStyle.text : 'text-gray-400'}>
            {getIcon()}
          </div>
        </div>

        {/* Content */}
        <div className="min-h-[60px] flex flex-col justify-between">
          <div>
            <p className="font-semibold text-xs text-gray-900 leading-tight line-clamp-2">
              {award.name}
            </p>
            <p className="text-xs text-gray-600 capitalize mt-1">
              {tierStyle.name}
            </p>
          </div>
          
          {/* Progress indicator */}
          <div className="mt-2">
            <p className={`text-xs font-medium ${
              isEarned ? 'text-green-600' : 'text-gray-500'
            }`}>
              {getProgressDisplay()}
            </p>
          </div>
        </div>
      </div>
      
      {/* Tier indicator corner */}
      <div className={`absolute top-1 right-1 w-3 h-3 rounded-full ${
        isEarned ? tierStyle.bg : 'bg-gray-300'
      } ${tierStyle.border} border`} />
      
      {/* Trophy/Badge type indicator */}
      <div className="absolute top-1 left-1">
        {award.kind === "Trophy" ? (
          <Trophy className="w-3 h-3 text-yellow-500" />
        ) : (
          <AwardIcon className="w-3 h-3 text-blue-500" />
        )}
      </div>
    </div>
  );
}
