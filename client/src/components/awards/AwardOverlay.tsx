
import { Award } from "@/lib/awards.types";
import { getAwardProgress, UserStats } from "@/lib/awards.progress";
import { TIER_COLORS } from "@/lib/awards.registry";
import { Trophy, Award as AwardIcon, Star, Zap, Shield, Target, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";

interface AwardOverlayProps {
  award: Award | null;
  userStats: UserStats;
  isOpen: boolean;
  onClose: () => void;
}

export function AwardOverlay({ award, userStats, isOpen, onClose }: AwardOverlayProps) {
  if (!award) return null;

  const progress = getAwardProgress(award, userStats);
  const tierStyle = TIER_COLORS[award.tier];
  const isEarned = progress.earned;

  const getIcon = () => {
    if (award.kind === "Trophy") {
      return <Trophy className="w-12 h-12" />;
    }
    
    if (award.name.includes("MVP")) return <Star className="w-12 h-12" />;
    if (award.name.includes("Hustle")) return <Zap className="w-12 h-12" />;
    if (award.name.includes("Teammate")) return <Shield className="w-12 h-12" />;
    if (award.name.includes("Clutch")) return <Target className="w-12 h-12" />;
    
    return <AwardIcon className="w-12 h-12" />;
  };

  const getProgressSection = () => {
    if (award.progressKind === "none") {
      return (
        <div className="text-center">
          <p className={`text-lg font-semibold ${
            isEarned ? 'text-green-600' : 'text-gray-500'
          }`}>
            {isEarned ? '✅ Earned' : '⏳ Not Yet Earned'}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            This award is granted by coaches
          </p>
        </div>
      );
    }

    if (progress.current !== undefined && progress.target !== undefined) {
      const percentage = Math.min((progress.current / progress.target) * 100, 100);
      
      return (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">
              {progress.label || "Progress"}
            </span>
            <span className={`text-sm font-semibold ${
              isEarned ? 'text-green-600' : 'text-gray-600'
            }`}>
              {progress.current}/{progress.target}
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-500 ${
                isEarned ? 'bg-green-500' : tierStyle.bg
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          
          {isEarned && (
            <p className="text-center text-green-600 font-semibold text-sm">
              🎉 Congratulations! Award Earned! 🎉
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="text-center">
        <p className={`text-lg font-semibold ${
          isEarned ? 'text-green-600' : 'text-gray-500'
        }`}>
          {isEarned ? '✅ Requirements Met' : '⏳ Requirements Not Met'}
        </p>
      </div>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
        <SheetHeader className="space-y-4">
          {/* Award Icon and Name */}
          <div className="flex flex-col items-center space-y-4">
            <div className={`w-20 h-20 rounded-xl flex items-center justify-center ${
              isEarned ? tierStyle.bg.replace('bg-', 'bg-opacity-20 bg-') : 'bg-gray-200'
            }`}>
              <div className={isEarned ? tierStyle.text : 'text-gray-400'}>
                {getIcon()}
              </div>
            </div>
            
            <div className="text-center space-y-2">
              <SheetTitle className="text-xl font-bold text-gray-900">
                {award.name}
              </SheetTitle>
              
              <div className="flex items-center justify-center space-x-3">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  isEarned ? tierStyle.bg + ' ' + tierStyle.text : 'bg-gray-200 text-gray-600'
                }`}>
                  {tierStyle.name}
                </span>
                
                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                  {award.kind}
                </span>
                
                <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">
                  {award.category.replace(/([A-Z])/g, ' $1').trim()}
                </span>
              </div>
            </div>
          </div>
          
          {/* Description */}
          <SheetDescription className="text-base text-gray-700 text-center leading-relaxed">
            {award.description}
          </SheetDescription>
        </SheetHeader>

        {/* Progress Section */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
            Progress
          </h3>
          {getProgressSection()}
        </div>

        {/* Additional Info */}
        <div className="mt-4 space-y-2">
          {award.programTag && (
            <div className="flex items-center justify-center">
              <span className="px-3 py-1 bg-purple-100 text-purple-600 rounded-full text-xs font-medium">
                {award.programTag} Program
              </span>
            </div>
          )}
          
          {award.tags && award.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center">
              {award.tags.map((tag, index) => (
                <span 
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <SheetClose asChild>
          <button className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </SheetClose>
      </SheetContent>
    </Sheet>
  );
}
