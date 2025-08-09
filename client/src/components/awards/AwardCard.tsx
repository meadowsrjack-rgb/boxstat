import { Award } from "@/lib/awards.types";

interface AwardCardProps {
  award: Award;
  progress: { earned: boolean; current?: number; target?: number; label?: string };
  onClick: () => void;
}

const TIER_COLORS = {
  HallOfFamer: "from-yellow-400 to-yellow-600",
  Superstar: "from-purple-400 to-purple-600", 
  AllStar: "from-blue-400 to-blue-600",
  Starter: "from-green-400 to-green-600",
  Prospect: "from-gray-400 to-gray-600",
  Legacy: "from-amber-400 to-amber-600",
  Team: "from-orange-400 to-orange-600"
};

export function AwardCard({ award, progress, onClick }: AwardCardProps) {
  const locked = !progress.earned;
  const tierColor = TIER_COLORS[award.tier];
  
  return (
    <button 
      onClick={onClick} 
      className="group rounded-lg border bg-card hover:shadow-md transition-all duration-200 p-3 text-left relative overflow-hidden"
      data-testid={`card-award-${award.id}`}
    >
      {/* Tier indicator */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${tierColor} ${locked ? 'opacity-40' : ''}`} />
      
      <div className={`aspect-square rounded flex items-center justify-center overflow-hidden bg-muted mb-2`}>
        <img
          src={`/assets/awards/${award.iconName}.png`}
          alt={award.name}
          className={`w-4/5 h-4/5 object-contain transition-all duration-200 ${
            locked ? "grayscale opacity-50" : "group-hover:scale-105"
          }`}
          loading="lazy"
          onError={(e) => {
            // Fallback to a default trophy/badge icon
            (e.target as HTMLImageElement).src = award.kind === 'Trophy' ? 
              '/assets/awards/default-trophy.png' : 
              '/assets/awards/default-badge.png';
          }}
        />
      </div>
      
      <div className={`text-sm font-medium leading-tight mb-1 ${locked ? 'text-muted-foreground' : ''}`}>
        {award.name}
      </div>
      
      <div className="text-xs text-muted-foreground mb-1">
        {award.tier} • {award.kind}
      </div>
      
      {award.progressKind !== "none" && (progress.current !== undefined && progress.target !== undefined) && (
        <div className="text-xs space-y-1">
          <div className="flex justify-between">
            <span>{progress.current} / {progress.target}</span>
            <span>{Math.round((progress.current / progress.target) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className={`h-1.5 rounded-full bg-gradient-to-r ${tierColor} transition-all duration-300`}
              style={{ width: `${Math.min((progress.current / progress.target) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}
      
      {locked && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
          <div className="text-white/80 text-xl">🔒</div>
        </div>
      )}
    </button>
  );
}