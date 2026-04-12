import { Award } from "@shared/awards.types";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface AwardOverlayProps {
  award: Award;
  progress: { earned: boolean; current?: number; target?: number; label?: string };
  isOpen: boolean;
  onClose: () => void;
}

const TIER_COLORS: Record<string, string> = {
  Bronze: "border-[#f5d0a9] bg-[#fdf2e6] text-[#92400e]",
  Silver: "border-[#cbd5e1] bg-[#f1f5f9] text-[#475569]",
  Gold: "border-[#fde047] bg-[#fefce8] text-[#854d0e]",
  Platinum: "border-[#67e8f9] bg-[#ecfeff] text-[#155e75]",
  Diamond: "border-[#c4b5fd] bg-[#f5f3ff] text-[#5b21b6]",
  Legend: "border-[#c4b5fd] text-white",
  HallOfFamer: "border-[#c4b5fd] bg-[#f5f3ff] text-[#5b21b6]",
  HOF: "border-[#c4b5fd] bg-[#f5f3ff] text-[#5b21b6]",
  Superstar: "border-[#67e8f9] bg-[#ecfeff] text-[#155e75]",
  AllStar: "border-[#fde047] bg-[#fefce8] text-[#854d0e]",
  "All-Star": "border-[#fde047] bg-[#fefce8] text-[#854d0e]",
  Starter: "border-[#cbd5e1] bg-[#f1f5f9] text-[#475569]",
  Prospect: "border-[#f5d0a9] bg-[#fdf2e6] text-[#92400e]",
  Team: "border-[#f5d0a9] bg-[#fdf2e6] text-[#92400e]",
};

const TIER_GRADIENTS: Record<string, string> = {
  Bronze: "from-[#f5d0a9] to-[#92400e]",
  Silver: "from-[#cbd5e1] to-[#475569]",
  Gold: "from-[#fde047] to-[#854d0e]",
  Platinum: "from-[#67e8f9] to-[#155e75]",
  Diamond: "from-[#c4b5fd] to-[#5b21b6]",
  Legend: "",
  HallOfFamer: "from-[#c4b5fd] to-[#5b21b6]",
  HOF: "from-[#c4b5fd] to-[#5b21b6]",
  Superstar: "from-[#67e8f9] to-[#155e75]",
  AllStar: "from-[#fde047] to-[#854d0e]",
  "All-Star": "from-[#fde047] to-[#854d0e]",
  Starter: "from-[#cbd5e1] to-[#475569]",
  Prospect: "from-[#f5d0a9] to-[#92400e]",
  Team: "from-[#f5d0a9] to-[#92400e]",
};

export function AwardOverlay({ award, progress, isOpen, onClose }: AwardOverlayProps) {
  const tierColor = TIER_COLORS[award.tier];
  const tierGradient = TIER_GRADIENTS[award.tier];
  const locked = !progress.earned;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto" data-testid="overlay-award">
        <SheetHeader className="space-y-4">
          <SheetTitle className="text-lg">{award.name}</SheetTitle>
        </SheetHeader>
        
        <div className="space-y-6 mt-6">
          {/* Award Icon & Status */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div
                className={`w-20 h-20 rounded-full p-1 ${tierGradient ? `bg-gradient-to-br ${tierGradient}` : ''}`}
                style={!tierGradient ? { background: 'linear-gradient(135deg, #e74c4c, #f59e0b, #22c55e, #3b82f6, #a855f7)' } : undefined}
              >
                <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                  <img 
                    src={`/assets/awards/${award.iconName}.png`} 
                    alt={award.name} 
                    className={`w-12 h-12 object-contain ${locked ? 'grayscale opacity-60' : ''}`}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = award.kind === 'Trophy' ? 
                        '/assets/awards/default-trophy.png' : 
                        '/assets/awards/default-badge.png';
                    }}
                  />
                </div>
              </div>
              {locked && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-2xl">🔒</div>
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <Badge
                variant="outline"
                className={tierColor}
                style={(award.tier === 'Legend' || award.tier === 'Legacy') ? { background: 'linear-gradient(90deg, #e74c4c, #f59e0b, #22c55e, #3b82f6, #a855f7)' } : undefined}
              >
                {award.tier} {award.kind}
              </Badge>
              <div className="text-sm text-muted-foreground mt-1">
                {award.category}
              </div>
              {progress.earned && (
                <Badge variant="default" className="mt-2 bg-green-100 text-green-800 border-green-300">
                  ✓ Earned
                </Badge>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="font-medium mb-2">Description</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {award.description}
            </p>
          </div>

          {/* Progress Section */}
          {award.progressKind !== "none" && (
            <div>
              <h3 className="font-medium mb-3">Progress</h3>
              
              {progress.current !== undefined && progress.target !== undefined ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{progress.label || "Progress"}</span>
                    <span className="font-medium">{progress.current} / {progress.target}</span>
                  </div>
                  <Progress 
                    value={(progress.current / progress.target) * 100} 
                    className="h-2"
                  />
                  <div className="text-xs text-muted-foreground text-center">
                    {Math.round((progress.current / progress.target) * 100)}% Complete
                  </div>
                </div>
              ) : progress.earned ? (
                <div className="text-sm text-green-600 font-medium">
                  ✓ Requirements met
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  {award.progressKind === "completeAll" && "Complete all required items"}
                  {award.progressKind === "counter" && `Reach the target count`}
                  {award.progressKind === "streak" && `Maintain the required streak`}
                </div>
              )}
            </div>
          )}

          {/* Requirements/How to Earn */}
          <div>
            <h3 className="font-medium mb-2">How to Earn</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              {award.counterOf && (
                <p>• Earn {award.counterOf.target} {award.counterOf.label || "achievements"}</p>
              )}
              {award.streakOf && (
                <p>• Maintain a streak of {award.streakOf.target} {award.streakOf.label || "consecutive events"}</p>
              )}
              {award.composite && (
                <div>
                  <p>• Meet all requirements:</p>
                  {award.composite.map((req, idx) => (
                    <p key={idx} className="ml-4">
                      - {req.stat.replace(/([A-Z])/g, ' $1').toLowerCase()}: {req.min || 1}
                      {req.seasonScoped && " (same season)"}
                    </p>
                  ))}
                </div>
              )}
              {award.completeAll && (
                <p>• Complete all items in the {award.completeAll.setId.replace('_', ' ')} collection</p>
              )}
              {award.progressKind === "none" && (
                <p>• Awarded by coach recognition</p>
              )}
            </div>
          </div>

          {/* Tags */}
          {award.tags && award.tags.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">Tags</h3>
              <div className="flex flex-wrap gap-1">
                {award.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}