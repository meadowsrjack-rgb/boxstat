import { Award } from "@shared/awards.types";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AwardBadge } from "./AwardBadge";
import { isIconIdentifier } from "./awardIcons";

interface AwardOverlayProps {
  award: Award;
  progress: { earned: boolean; current?: number; target?: number; label?: string };
  isOpen: boolean;
  onClose: () => void;
}

export function AwardOverlay({ award, progress, isOpen, onClose }: AwardOverlayProps) {
  const locked = !progress.earned;
  const iconId = award.imageUrl && isIconIdentifier(award.imageUrl) ? award.imageUrl : null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto" data-testid="overlay-award">
        <SheetHeader className="space-y-4">
          <SheetTitle className="text-lg">{award.name}</SheetTitle>
        </SheetHeader>
        
        <div className="space-y-6 mt-6">
          <div className="flex items-center gap-4">
            <AwardBadge
              tier={award.tier}
              icon={iconId}
              size={80}
              locked={locked}
            />
            
            <div className="flex-1">
              <Badge variant="outline">
                {award.tier}
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

          <div>
            <h3 className="font-medium mb-2">Description</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {award.description}
            </p>
          </div>

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
