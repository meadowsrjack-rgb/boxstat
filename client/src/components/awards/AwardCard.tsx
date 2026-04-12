import { Lock } from "lucide-react";
import { Award } from "@shared/awards.types";
import { getAwardIcon, isIconIdentifier } from "./awardIcons";

interface AwardCardProps {
  award: Award & { imageUrl?: string | null };
  progress: { earned: boolean; current?: number; target?: number; label?: string };
  onClick: () => void;
}

const TIER_COLORS: Record<string, string> = {
  Bronze: "from-[#f5d0a9] to-[#92400e]",
  Silver: "from-[#cbd5e1] to-[#475569]",
  Gold: "from-[#fde047] to-[#854d0e]",
  Platinum: "from-[#67e8f9] to-[#155e75]",
  Diamond: "from-[#c4b5fd] to-[#5b21b6]",
  Legend: "from-[#fef2f2] via-[#f5f3ff] to-[#eff6ff]",
  HallOfFamer: "from-[#c4b5fd] to-[#5b21b6]",
  HOF: "from-[#c4b5fd] to-[#5b21b6]",
  Superstar: "from-[#67e8f9] to-[#155e75]",
  AllStar: "from-[#fde047] to-[#854d0e]",
  "All-Star": "from-[#fde047] to-[#854d0e]",
  Starter: "from-[#cbd5e1] to-[#475569]",
  Prospect: "from-[#f5d0a9] to-[#92400e]",
  Legacy: "from-[#fef2f2] via-[#f5f3ff] to-[#eff6ff]",
  Team: "from-[#f5d0a9] to-[#92400e]",
};

export function AwardCard({ award, progress, onClick }: AwardCardProps) {
  const locked = !progress.earned;
  const tierColor = TIER_COLORS[award.tier as keyof typeof TIER_COLORS] || TIER_COLORS.Bronze;

  const imageUrl = award.imageUrl;

  let iconContent: React.ReactNode;

  if (imageUrl && isIconIdentifier(imageUrl)) {
    const LucideIcon = getAwardIcon(imageUrl)!;
    iconContent = (
      <LucideIcon
        className={`w-4/5 h-4/5 transition-all duration-200 ${
          locked ? "opacity-40 grayscale" : "text-primary group-hover:scale-105"
        }`}
      />
    );
  } else if (imageUrl) {
    iconContent = (
      <img
        src={imageUrl}
        alt={award.name}
        className={`w-4/5 h-4/5 object-contain transition-all duration-200 ${
          locked ? "grayscale opacity-50" : "group-hover:scale-105"
        }`}
        loading="lazy"
        onError={(e) => {
          (e.target as HTMLImageElement).src = award.kind === 'Trophy' ? 
            '/assets/awards/default-trophy.png' : 
            '/assets/awards/default-badge.png';
        }}
      />
    );
  } else {
    iconContent = (
      <img
        src={`/assets/awards/${award.iconName}.png`}
        alt={award.name}
        className={`w-4/5 h-4/5 object-contain transition-all duration-200 ${
          locked ? "grayscale opacity-50" : "group-hover:scale-105"
        }`}
        loading="lazy"
        onError={(e) => {
          (e.target as HTMLImageElement).src = award.kind === 'Trophy' ? 
            '/assets/awards/default-trophy.png' : 
            '/assets/awards/default-badge.png';
        }}
      />
    );
  }

  return (
    <button 
      onClick={onClick} 
      className="group rounded-lg border bg-card hover:shadow-md transition-all duration-200 p-3 text-left relative overflow-hidden"
      data-testid={`card-award-${award.id}`}
    >
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${tierColor} ${locked ? 'opacity-40' : ''}`} />
      
      <div className="aspect-square rounded flex items-center justify-center overflow-hidden bg-muted mb-2">
        {iconContent}
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
          <div className="bg-black/40 rounded-full p-2">
            <Lock className="h-5 w-5 text-white/80" />
          </div>
        </div>
      )}
    </button>
  );
}
