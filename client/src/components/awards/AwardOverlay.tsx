import { Award } from "@/lib/awards.types";
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

const TIER_COLORS = {
  HallOfFamer: "border-yellow-400 bg-yellow-50 text-yellow-800",
  Superstar: "border-purple-400 bg-purple-50 text-purple-800", 
  AllStar: "border-blue-400 bg-blue-50 text-blue-800",
  Starter: "border-green-400 bg-green-50 text-green-800",
  Prospect: "border-gray-400 bg-gray-50 text-gray-800",
  Legacy: "border-amber-400 bg-amber-50 text-amber-800",
  Team: "border-orange-400 bg-orange-50 text-orange-800"
};

const TIER_GRADIENTS = {
  HallOfFamer: "from-yellow-400 to-yellow-600",
  Superstar: "from-purple-400 to-purple-600", 
  AllStar: "from-blue-400 to-blue-600",
  Starter: "from-green-400 to-green-600",
  Prospect: "from-gray-400 to-gray-600",
  Legacy: "from-amber-400 to-amber-600",
  Team: "from-orange-400 to-orange-600"
};

export function AwardOverlay({ award, progress, isOpen, onClose }: AwardOverlayProps) {
  const tierColor = TIER_COLORS[award.tier];
  const tierGradient = TIER_GRADIENTS[award.tier];
  const locked = !progress.earned;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto" data-testid="overlay-award">
        <SheetHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg">{award.name}</SheetTitle>
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-overlay">
              ✕
            </Button>
          </div>
        </SheetHeader>
        
        <div className="space-y-6 mt-6">
          {/* Award Icon & Status */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${tierGradient} p-1`}>
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
              <Badge variant="outline" className={tierColor}>
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