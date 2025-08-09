import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Search, Filter, SlidersHorizontal, Trophy, Medal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AWARDS, TIER_ORDER } from "@/lib/awards.registry";
import { MOCK_USER_STATS, getAwardProgress } from "@/lib/awards.progress";
import { 
  loadAwardsFilters, 
  saveAwardsFilters, 
  AwardsFilterState, 
  FILTER_OPTIONS 
} from "@/state/awardsFilters";
import { AwardCard } from "@/components/awards/AwardCard";
import { AwardOverlay } from "@/components/awards/AwardOverlay";
import { Award } from "@/lib/awards.types";

export default function TrophiesBadges() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<AwardsFilterState>(loadAwardsFilters);
  const [selectedAward, setSelectedAward] = useState<Award | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const updateFilters = (updates: Partial<AwardsFilterState>) => {
    const newFilters = { ...filters, ...updates };
    setFilters(newFilters);
    saveAwardsFilters(newFilters);
  };

  // Calculate stats for the header
  const stats = useMemo(() => {
    const totalAwards = AWARDS.length;
    const earnedAwards = AWARDS.filter(award => 
      getAwardProgress(award, MOCK_USER_STATS).earned
    ).length;
    const trophies = AWARDS.filter(award => award.kind === "Trophy").length;
    const badges = AWARDS.filter(award => award.kind === "Badge").length;
    const earnedTrophies = AWARDS.filter(award => 
      award.kind === "Trophy" && getAwardProgress(award, MOCK_USER_STATS).earned
    ).length;
    const earnedBadges = AWARDS.filter(award => 
      award.kind === "Badge" && getAwardProgress(award, MOCK_USER_STATS).earned
    ).length;

    return {
      totalAwards,
      earnedAwards,
      trophies,
      badges,
      earnedTrophies,
      earnedBadges,
      completionRate: Math.round((earnedAwards / totalAwards) * 100)
    };
  }, []);

  const filteredAndSortedAwards = useMemo(() => {
    let filtered = AWARDS.filter(award => {
      if (filters.tier && award.tier !== filters.tier) return false;
      if (filters.category && award.category !== filters.category) return false;
      if (filters.showOnlyEarned) {
        const progress = getAwardProgress(award, MOCK_USER_STATS);
        if (!progress.earned) return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return award.name.toLowerCase().includes(query) ||
               award.description.toLowerCase().includes(query) ||
               award.tags?.some(tag => tag.toLowerCase().includes(query));
      }
      return true;
    });

    // Sort the filtered awards
    filtered.sort((a, b) => {
      switch (filters.sort) {
        case "alpha":
          return a.name.localeCompare(b.name);
        case "tier": {
          const aIndex = TIER_ORDER.indexOf(a.tier);
          const bIndex = TIER_ORDER.indexOf(b.tier);
          if (aIndex !== bIndex) return aIndex - bIndex;
          // Within same tier, sort by kind (Trophies first, then Badges)
          if (a.kind !== b.kind) return a.kind === "Trophy" ? -1 : 1;
          return a.name.localeCompare(b.name);
        }
        case "completion": {
          const aProgress = getAwardProgress(a, MOCK_USER_STATS);
          const bProgress = getAwardProgress(b, MOCK_USER_STATS);
          if (aProgress.earned !== bProgress.earned) {
            return bProgress.earned ? 1 : -1; // Earned first
          }
          // Then by progress percentage
          const aPercent = (aProgress.current || 0) / (aProgress.target || 1);
          const bPercent = (bProgress.current || 0) / (bProgress.target || 1);
          return bPercent - aPercent;
        }
        case "recent":
          // For now, just sort by tier since we don't have earned dates
          const aIndex2 = TIER_ORDER.indexOf(a.tier);
          const bIndex2 = TIER_ORDER.indexOf(b.tier);
          return aIndex2 - bIndex2;
        default:
          return 0;
      }
    });

    return filtered;
  }, [searchQuery, filters]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation("/player")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-600" />
              <h1 className="text-xl font-semibold">Trophies & Badges</h1>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-muted rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-green-600">{stats.earnedAwards}</div>
              <div className="text-xs text-muted-foreground">Earned</div>
            </div>
            <div className="bg-muted rounded-lg p-3 text-center">
              <div className="text-lg font-bold">{stats.totalAwards}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="bg-muted rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-yellow-600">{stats.earnedTrophies}/{stats.trophies}</div>
              <div className="text-xs text-muted-foreground">Trophies</div>
            </div>
            <div className="bg-muted rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-blue-600">{stats.earnedBadges}/{stats.badges}</div>
              <div className="text-xs text-muted-foreground">Badges</div>
            </div>
          </div>

          {/* Search and Filter Bar */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search awards..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
                data-testid="button-toggle-filters"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </Button>
            </div>

            {/* Filter Controls */}
            {showFilters && (
              <div className="bg-muted rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs font-medium mb-2 block">Tier</Label>
                    <Select 
                      value={filters.tier || ""} 
                      onValueChange={(value) => updateFilters({ tier: value || undefined })}
                    >
                      <SelectTrigger data-testid="select-tier">
                        <SelectValue placeholder="All Tiers" />
                      </SelectTrigger>
                      <SelectContent>
                        {FILTER_OPTIONS.tiers.map((tier) => (
                          <SelectItem key={tier.value} value={tier.value}>
                            {tier.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-medium mb-2 block">Category</Label>
                    <Select 
                      value={filters.category || ""} 
                      onValueChange={(value) => updateFilters({ category: value || undefined })}
                    >
                      <SelectTrigger data-testid="select-category">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        {FILTER_OPTIONS.categories.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-medium mb-2 block">Sort</Label>
                    <Select 
                      value={filters.sort || "tier"} 
                      onValueChange={(value) => updateFilters({ sort: value as any })}
                    >
                      <SelectTrigger data-testid="select-sort">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FILTER_OPTIONS.sorts.map((sort) => (
                          <SelectItem key={sort.value} value={sort.value}>
                            {sort.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="earned-only"
                    checked={filters.showOnlyEarned || false}
                    onCheckedChange={(checked) => updateFilters({ showOnlyEarned: checked })}
                    data-testid="switch-earned-only"
                  />
                  <Label htmlFor="earned-only" className="text-sm">
                    Show only earned awards
                  </Label>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Awards Grid */}
      <div className="container mx-auto px-4 py-6">
        {filteredAndSortedAwards.length === 0 ? (
          <div className="text-center py-12">
            <Medal className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No awards found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? "Try adjusting your search" : "Try different filters"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredAndSortedAwards.map((award) => {
              const progress = getAwardProgress(award, MOCK_USER_STATS);
              return (
                <AwardCard
                  key={award.id}
                  award={award}
                  progress={progress}
                  onClick={() => setSelectedAward(award)}
                />
              );
            })}
          </div>
        )}

        {/* Results Info */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          Showing {filteredAndSortedAwards.length} of {AWARDS.length} awards
          {filters.showOnlyEarned && " (earned only)"}
        </div>
      </div>

      {/* Award Detail Overlay */}
      {selectedAward && (
        <AwardOverlay
          award={selectedAward}
          progress={getAwardProgress(selectedAward, MOCK_USER_STATS)}
          isOpen={!!selectedAward}
          onClose={() => setSelectedAward(null)}
        />
      )}
    </div>
  );
}