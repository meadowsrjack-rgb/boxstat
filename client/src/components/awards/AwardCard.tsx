import { Lock } from "lucide-react";
import { Award } from "@shared/awards.types";
import { AwardBadge } from "./AwardBadge";
import { isIconIdentifier } from "./awardIcons";

interface AwardCardProps {
  award: Award & { imageUrl?: string | null };
  progress: { earned: boolean; current?: number; target?: number; label?: string };
  onClick: () => void;
}

export function AwardCard({ award, progress, onClick }: AwardCardProps) {
  const locked = !progress.earned;
  const iconId = award.imageUrl && isIconIdentifier(award.imageUrl) ? award.imageUrl : null;

  return (
    <button 
      onClick={onClick} 
      className="group rounded-lg border bg-card hover:shadow-md transition-all duration-200 p-3 text-left relative overflow-hidden"
      data-testid={`card-award-${award.id}`}
    >
      <div className="aspect-square rounded flex items-center justify-center overflow-hidden mb-2">
        <AwardBadge
          tier={award.tier}
          icon={iconId}
          size={100}
          locked={locked}
          className="transition-all duration-200 group-hover:scale-105"
        />
      </div>
      
      <div className={`text-sm font-medium leading-tight mb-1 ${locked ? 'text-muted-foreground' : ''}`}>
        {award.name}
      </div>
      
      <div className="text-xs text-muted-foreground mb-1">
        {award.tier}
      </div>
      
      {award.progressKind !== "none" && (progress.current !== undefined && progress.target !== undefined) && (
        <div className="text-xs space-y-1">
          <div className="flex justify-between">
            <span>{progress.current} / {progress.target}</span>
            <span>{Math.round((progress.current / progress.target) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="h-1.5 rounded-full bg-primary transition-all duration-300"
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
